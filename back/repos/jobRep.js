import { logger } from '../monitoring/logger.js';
const loggy = logger.child({ Module: 'jobRepo' });

class jobRepo{
    constructor(dbConnection){
        this.sql = dbConnection
    }

    async addMetaData(uuid, filename, mimeType, userId, size, bucketPath){
        try {
            let res = await this.sql`INSERT INTO filemetadata (id,file_name,mime_type,size_bytes,userid,s3_link) VALUES(${uuid},${filename},${mimeType},${size},${userId},${bucketPath})`
            return res;
        } catch (error) {
            loggy.error({ fn: 'addMetaData', uuid, filename, mimeType, userId, size, bucketPath, err: error }, 'DB insert failed: filemetadata');
            throw error;
        }
    }

    async addJob(uid, id, jobPath){
        try {
            let res = await this.sql`INSERT INTO jobs (id,user_id,status,original_path) VALUES(${uid},${id},${"queued"},${jobPath})`
            return res.count > 0;
        } catch (error) {
            loggy.error({ fn: 'addJob', uid, userId: id, jobPath, err: error }, 'DB insert failed: jobs');
            throw error;
        }
    }

    async updateJob(original_Path, processed_Path, jobType){
        try {
            const normalizedJobType = String(jobType);
            let res = await this.sql`UPDATE jobs SET status=${'complete'}, processed_path=${processed_Path}, "jobType"=${normalizedJobType}, finished_at=now() WHERE original_path=${original_Path}`
            if (res.count === 0) {
                loggy.warn({ fn: 'updateJob', original_Path, processed_Path, jobType: normalizedJobType }, 'updateJob matched 0 rows — original_path not found in DB');
            }
            return res;
        } catch (error) {
            loggy.error({ fn: 'updateJob', original_Path, processed_Path, jobType, err: error }, 'DB update failed: jobs');
            throw error;
        }
    }

    async getJobsForUser(userId, jobType){
        try {
            const normalizedJobType = String(jobType);
            let res = await this.sql`SELECT processed_path FROM jobs WHERE user_id = ${userId} AND "jobType"=${normalizedJobType} ORDER BY created_at DESC LIMIT 50`
            return res;
        } catch (error) {
            loggy.error({ fn: 'getJobsForUser', userId, jobType, err: error }, 'DB select failed: jobs');
            throw error;
        }
    }

    async hasFile(userId, fileName){
        try {
            let res = await this.sql`SELECT id FROM jobs WHERE processed_path=${fileName} AND user_id=${userId}`;
            return res.length > 0;
        } catch (error) {
            loggy.error({ fn: 'hasFile', userId, fileName, err: error }, 'DB select failed: jobs');
            throw error;
        }
    }

    async removeFile(fileName){
        try {
            let res = await this.sql`DELETE FROM jobs WHERE processed_path=${fileName}`
            return res;
        } catch (error) {
            loggy.error({ fn: 'removeFile', fileName, err: error }, 'DB delete failed: jobs');
            throw error;
        }
    }
}

export {jobRepo}
