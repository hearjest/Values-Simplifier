import dq from '../comm/queue.js'
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../monitoring/logger.js';
import { s3Client } from '../comm/minioConn.js'; 
const loggy = logger.child({ Module: 'JobRepo'});

class Job {
    constructor(jobRep, redis) {
        this.jobRep = jobRep;
        this.redis = redis;
        this.s3Client = s3Client; 
    }
    /**
     * @param {Integer} userId 
     * @param {Buffer} fileBuffer
     * @param {String} originalName
     * 
     */
    async createJob(userId, originalName, method, uuid, newFilePath, mimeType, size) {
        loggy.info({ userId, uuid, originalName, newFilePath, method, mimeType, size }, 'createJob called');
        try {
            await this.jobRep.addMetaData(uuid, originalName, mimeType, userId, size, newFilePath);
            loggy.info({ userId, uuid }, 'File metadata written');

            await this.jobRep.addJob(uuid, userId, originalName);
            loggy.info({ userId, uuid }, 'Job row inserted');

            const job = await dq.add('process-image',
                {
                    newFilePath,
                    originalFilePath: originalName,
                    uid: uuid,
                    userId,
                    jobType: 'imageProcess',
                    method,
                },
                {
                    removeOnComplete: true,
                    attempts: 1,
                });
            loggy.info({ userId, uuid, bullmqJobId: job.id }, 'Job queued in BullMQ');
            return { jobId: job.id };
        } catch (error) {
            loggy.error({ userId, uuid, originalName, newFilePath, method, err: error }, 'createJob failed');
            throw error;
        }
    }

    async s3ObjectExists(bucket, key) {
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
        await this.s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    }

    async s3RemoveObject(bucket, key) {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    }

    async s3PresignedPutUrl(bucket, key, expiresIn = 900) {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const command = new PutObjectCommand({ Bucket: bucket, Key: key });
        const url = await getSignedUrl(this.s3Client, command, { expiresIn });
        return url;

    }

    async s3PresignedGetUrl(bucket, key, expiresIn = 900) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const url = await getSignedUrl(this.s3Client, command, { expiresIn });
        return url;
    }

    async getImagesForUser(userId,jobType) {
        try {
            loggy.info({ userId: userId, method: "getImagesForUser" }, `Attempting to get files for user ${userId} via redis' cache`);
            const cacheKey = `users:${userId}:urls:${jobType}`;
            const cacheResult = await this.redis.getCachedUrls(cacheKey);

            if (cacheResult) {
                return JSON.parse(cacheResult);
            } else {
                loggy.info({ userId: userId, method: "getImagesForUser" }, `Cache missed`);
                const paths = await this.jobRep.getJobsForUser(userId,jobType);
                const urls = [];
                let url = null;
                const bucket = process.env.S3_BUCKET_NAME;
                for (let i = 0; i < paths.length; i++) {
                    try {
                        const exists = await this.s3ObjectExists(bucket, paths[i]['processed_path']);
                        if (exists) {
                            url = await this.s3PresignedGetUrl(bucket,paths[i]['processed_path']);
                            urls.push(url);
                            console.log(url)
                        }
                    } catch (err) {
                        continue;
                    }
                }
                this.redis.set(cacheKey, JSON.stringify(urls), "EX", 600);
                return urls;
            }
        } catch (error) {
            loggy.error({ userId: userId, function: 'getImagesForUser', err: error }, "Error getting files for user");
        }
    }

    async removeImage(userId, fileName) {
        let hasFileDB = await this.jobRep.hasFile(userId, fileName);
        let hasFileBucket = await this.s3ObjectExists(process.env.S3_BUCKET_NAME, fileName);
        if (hasFileDB && hasFileBucket) {
            await this.jobRep.removeFile(fileName);
            await this.s3RemoveObject(process.env.S3_BUCKET_NAME, fileName);
            await this.redis.del(`users:${userId}:urls`);
            await this.redis.del(`users:${userId}:urls:img`);
            await this.redis.del(`users:${userId}:urls:subs`);
            await this.redis.del(`users:${userId}:urls:subtitle`);
            return "success!";
        } else {
            return "failed";
        } 
    }

    async obtainPresigned(fileDetails) { 
        const { userId, fileName } = fileDetails;
        const uuid = uuidv4();
        const status = {
            "url": '',
            "res": 'Failed',
            "newPath": "",
            "uuid": uuid
        };
        const newFileName = `${userId}-${uuid}-${fileName}`;
        try {
            const url = await this.s3PresignedPutUrl(process.env.S3_BUCKET_NAME, `${newFileName}`);
            status.url = url;
            status.res = 'Success';
            status.newPath = newFileName;
            return status;
        } catch (e) {
            console.log(e);
            loggy.warn({ userId: userId, fileName: fileName, e: e }, "Failed to upload file");
            return status;
        }
    }

    async putUrlInQueue(userId,url){
        // const {userId,url}=fileDetails
        const uuid = uuidv4();
        const videoId=(url.split('v='))[1]
        const newFileName=`${userId}-${videoId}-${uuid}`
        const job = await dq.add('subtitle',
            {newFilePath: "",
                url: url,
                uid: uuid,
                userId: userId,
                jobType: "subtitle",
                videoId:videoId
            },{
                removeOnComplete: true,
                attempts: 3,
        });
        await this.addInitialData(uuid,userId,url,newFileName)
        
        loggy.info({ userId: userId, function: 'createJob' }, "Adding job to bullmq queue");
        return { jobId: job.id ,newFileName: newFileName,videoId:videoId};
    }

    async addInitialData(uuid,userId,originalname,newFilePath){
        await this.jobRep.addJob(uuid, userId, originalname);
        await this.jobRep.addMetaData(uuid, originalname, 'srt', userId, 1, newFilePath)
    }
    
}

export {Job}