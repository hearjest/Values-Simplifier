
class health{
    constructor(db,minio,redis,queue){
        this.db=db;
        this.minio=minio;
        this.redis=redis;
        this.queue=queue
    }

    async checkDB(){
        let status,message;
        try{
            let res=await this.db`SELECT 1`;
            status='ok';
            message=res;
            return {status:status,message:message}
        }catch(error){
            status='failed';
            return {status:status,message:error}
        }
    }

    async checkMinio(){
        try{
            const res = await this.minio.bucketExists(process.env.MINIO_BUCKET1);
            return { status: 'ok', message: `Bucket exists: ${exists}` };
        }catch(error){
            return {status:'failed',message:error}  
        } 
    }

    async checkRedis(){
        try{
            let res=await this.redis.ping();
            return { status:'ok',message: res}; 
        }catch(error){
            return { status:'failed', message:error};
        }
    }

    async checkQueue(){
        try{
            const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed');
            return { 
                status: 'ok', 
                metrics: {
                    waiting: counts.waiting,
                    active: counts.active,
                    completed: counts.completed,
                    failed: counts.failed
                }
            };
        }catch(error){
            return { status: 'failed', message: error };
        }
    }

    async checkWorker(){
        try{
            const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed');
            if(counts.waiting > 20 && counts.active === 0){
                return {
                    status:'warning',
                    message:'Worker may be down',
                    metrics: counts
                };
            }
            return { 
                status:'ok',
                metrics: counts
            };
        }catch(error){
            return { status: 'failed', message: error };
        }
    }

    async checkAll(){
        const [db, minio, redis, worker] = await Promise.all([
            this.checkDB(),
            this.checkMinio(),
            this.checkRedis(),
            this.checkWorker()
        ]);
        const allHealthy = [db, minio, redis, worker].every(
            check=>check.status === 'ok'||check.status ==='warning'
        );
        return {
            healthy: allHealthy,
            checks: {db,minio,redis,worker}
        };
    }
}

export { health };
