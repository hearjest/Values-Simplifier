import dq from '../comm/queue.js'
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();
import {logger} from '../monitoring/logger.js'
import Module from 'module';
const loggy=logger.child({Module:'JobRepo'})
class Job{
    constructor(jobRep,minioClient,redis,minPubCli){
        this.jobRep =jobRep;
        this.minioClient=minioClient;
        this.redis=redis;
        this.minPubCli=minPubCli
    }
    /**
     * @param {Integer} userId 
     * @param {Buffer} fileBuffer
     * @param {String} originalName
     * 
     */
    async createJob(userId, originalName, method,uuid,newFilePath,mimeType,size){
        const pathForWorker=`${uuid}-${originalName}`;
        //const pathForStorage=path.join('./temp',`${uuid}-${originalName}`);
        try{
            loggy.info({userId:userId, function:'createJob'},"Writing file")
            //await fs.writeFile(pathForStorage, fileBuffer);
            await this.jobRep.addMetaData(uuid,originalName,mimeType,userId,size,newFilePath)
        }catch(error){
            loggy.error({userId:userId,function:'createJob',err:error},"Error writing file metadata")
        }
        
        const jobType=method
        try{
            loggy.info({userId:userId, function:'createJob'},"Adding job to database")
            await this.jobRep.addJob(uuid, userId, newFilePath,jobType|null);
        }catch(error){
            loggy.error({userId:userId,function:'createJob',err:error},"Error Adding job to database")
        }
        try{
            loggy.info({userId:userId, function:'createJob'},"Adding job to bullmq queue")
            const job =await dq.add('process-image',
                {filePath:newFilePath,
                fileName:newFilePath,
                uid: uuid, 
                userId:userId,
                jobType:jobType
            },
        {
            removeOnComplete:true,
            attempts:3,
        })
            return {jobId:job.id}
        }catch(error){
            loggy.error({userId:userId,function:'createJob',err:error},"Error Adding job to database")
        }
    }

    async getImagesForUser(userId){
        try{
            loggy.info({userId:userId,method:"getImagesForUser"},`Attempting to get files for user ${userId} via redis' cache`)
            const cacheResult=await this.redis.getCachedUrls(`users:${userId}:urls`)

            if(cacheResult){
                return JSON.parse(cacheResult);
            }else{
                loggy.info({userId:userId, method:"getImagesForUser"}, `Cache missed`);
                const paths = await this.jobRep.getJobsForUser(userId);
                const urls=[];
                let url=null;
                const publicMinioUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
                const bucket = process.env.MINIO_BUCKET1;
                for(let i=0;i<paths.length;i++){
                    try{
                        let status=await this.minioClient.statObject(bucket, paths[i]['processed_path']);
                        url = `${publicMinioUrl}/${bucket}/${paths[i]['processed_path']}`;
                        urls.push(url)
                    }catch(err){
                        continue;
                    }
                }
                this.redis.set(`users:${userId}:urls`,JSON.stringify(urls),"EX",600)

                return urls;
            }
            
        }catch(error){
            loggy.error({userId:userId,function:'getImagesForUser',err:error},"Error getting files for user")
        }
        
    }

    async removeImage(userId,fileName){
        let hasFileDB=await this.jobRep.hasFile(userId,fileName)
        let hasFileBucket=await this.minioClient.statObject(process.env.MINIO_BUCKET1,fileName)
        if(hasFileDB&&hasFileBucket){
            let result = await this.jobRep.removeFile(fileName);
            let result2=await this.minioClient.removeObject(process.env.MINIO_BUCKET1,fileName)
            let result3=await this.redis.del(`users:${userId}:urls`)
            let newUrls=await this.getImagesForUser(userId)
            return "success!"
        }else{
            return "failed"
        }

    }

    async obtainPresigned(fileDetails){//need another method to add to db
        const {userId,fileName, mimeType, sizeGB}=fileDetails
        const uuid = uuidv4();
        const status={
            "url":'',
            "res":'Failed',
            "newPath":"",
            "uuid":uuid
        }
        const newFileName =`${userId}-${uuid}-${fileName}`
        try{
            const url = await this.minPubCli.presignedPutObject(process.env.MINIO_BUCKET1,`${newFileName}`);
            status.url=url;
            status.res='Success';
            status.newPath=newFileName
            return status;
        } catch(e){
            console.log(e)
            loggy.warn(({userId:userId,fileName:fileName,e:e},"Failed to upload file"));
            return status
        }
    }

    async sendFileMetaDataToDB(fileDetails){
        const {userId,fileName, mimeType, sizeGB}=fileDetails
    }

    
}

export {Job}