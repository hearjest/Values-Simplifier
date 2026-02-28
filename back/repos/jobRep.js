class jobRepo{
    constructor(dbConnection){
        this.sql = dbConnection
    }

    async addJob(uid,id,jobPath,jobType){
        try{
            let res = await this.sql`INSERT INTO jobs (id,user_id,status,original_path) VALUES(${uid},${id},${"queued"},${jobPath})`
            return res.length > 0;
        }catch(error){
            throw error;
        }
        
    }

    async updateJob(original_Path,processed_Path){
        try{
            let res = await this.sql`UPDATE jobs SET status=${'complete'}, processed_path=${processed_Path}, finished_at=now() WHERE original_path=${original_Path}`
            return res
        }catch(error){
            throw error;
        }
        
    }

    async getJobsForUser(userId){
        try{
            let res = await this.sql`SELECT processed_path FROM jobs WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`
            return res
        }catch(error){
            throw error;
        }
        
    }


    async hasFile(userId,fileName){//later multiple users should be able to check. the file should have a column for users who have access
        try{
            let res = await this.sql`SELECT id FROM jobs WHERE processed_path=${fileName} AND user_id=${userId}`;
            return res.length>0
        }catch(error){
            throw error;
        }
        
    }

    async removeFile(fileName){
        try{
            let res = await this.sql`DELETE FROM jobs WHERE processed_path=${fileName}`
            return res;
        }catch(error){
            throw error;
        }
        
    }

}

export {jobRepo}