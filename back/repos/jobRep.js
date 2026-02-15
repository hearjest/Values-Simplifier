class jobRepo{
    constructor(dbConnection){
        this.sql = dbConnection
    }

    async addJob(uid,id,jobPath,jobType){
        console.log('jobRepo.addJob called with:');
        console.log('  uid:', uid, 'type:', typeof uid);
        console.log('  id:', id, 'type:', typeof id);
        console.log('  jobPath:', jobPath, 'type:', typeof jobPath);
        
        let res = await this.sql`INSERT INTO jobs (id,user_id,status,original_path) VALUES(${uid},${id},${"queued"},${jobPath})`
        return res.length > 0;
    }

    async updateJob(original_Path,processed_Path){
        let res = await this.sql`UPDATE jobs SET status=${'complete'}, processed_path=${processed_Path}, finished_at=now() WHERE original_path=${original_Path}`
        return res
    }

    async getJobsForUser(userId){
        let res = this.sql`SELECT * FROM jobs WHERE user_id = ${userId}`
        return res[0]
    }

}

export {jobRepo}