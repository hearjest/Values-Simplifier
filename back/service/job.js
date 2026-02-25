import dq from '../comm/queue.js'
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();
class Job{
    constructor(jobRep,minioClient){
        this.jobRep =jobRep;
        this.minioClient=minioClient;
    }
    /**
     * @param {Integer} userId 
     * @param {Buffer} fileBuffer
     * @param {String} originalName
     * 
     */
    async createJob(userId, fileBuffer, originalName, metadata){
        let uuid = uuidv4();
        const pathForWorker=path.join('./temp', `${uuid}-${originalName}`);
        const pathForStorage=path.join('./temp',`${uuid}-${originalName}`);
        await fs.writeFile(pathForStorage, fileBuffer);
        const jobType=metadata.method
        await this.jobRep.addJob(uuid, userId, pathForWorker,jobType|null);
        const job =await dq.add('process-image',
        {filePath:pathForWorker,
          fileName:originalName,
          uid: uuid,
          meta:metadata,
          userId:userId,
          jobType:jobType
        })
        return {jobId:job.id}
    }

    async getImagesForUser(userId){
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
        return urls;
    }

    async removeImage(userId,fileName){
        console.log("AT JOBS")
        let hasFileDB=await this.jobRep.hasFile(userId,fileName)
        let hasFileBucket=await this.minioClient.statObject(process.env.MINIO_BUCKET1,fileName)
        console.log(`hasFileDB=${hasFileDB}`);
        console.log(`hasFileBucket=${hasFileBucket}`);
        if(hasFileDB&&hasFileBucket){
            console.log("yaye")
            let result = await this.jobRep.removeFile(fileName);
            let result2=await this.minioClient.removeObject(process.env.MINIO_BUCKET1,fileName)
            console.log(`Removed ${fileName}`)
            return "success!"
        }else{
            console.log("no!!!!!")
            return "failed"
        }

    }

    
}

export {Job}