class jobRepo{
    constructor(dbConnection){
        this.sql = dbConnection
    }

    async addMetaData(uuid,filename,mimeType,userId,size,bucketPath){
        let res = await this.sql`INSERT INTO filemetadata (id,file_name,mime_type,size_bytes,userid,s3_link) VALUES(${uuid},${filename},${mimeType},${size},${userId},${bucketPath})`
        return res;
    }

    async addJob(uid,id,jobPath){
        let res = await this.sql`INSERT INTO jobs (id,user_id,status,original_path) VALUES(${uid},${id},${"queued"},${jobPath})`
        return res.length > 0;
    }

    async updateJob(original_Path,processed_Path){
        let res = await this.sql`UPDATE jobs SET status=${'complete'}, processed_path=${processed_Path}, finished_at=now() WHERE original_path=${original_Path}`
        return res
        
    }

    async getJobsForUser(userId){
        let res = await this.sql`SELECT processed_path FROM jobs WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`
        return res
    }

    async hasFile(userId,fileName){//later multiple users should be able to check. the file should have a column for users who have access
        let res = await this.sql`SELECT id FROM jobs WHERE processed_path=${fileName} AND user_id=${userId}`;
        return res.length>0
    }

    async removeFile(fileName){
        let res = await this.sql`DELETE FROM jobs WHERE processed_path=${fileName}`
        return res;
        
    }

}

export {jobRepo}