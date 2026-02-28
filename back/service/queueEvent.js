import { QueueEvents } from 'bullmq';
import {getIO} from '../comm/socket_dot_io.js'
import {connection} from '../comm/redisConnection.js'
import {logger} from '../monitoring/logger.js'
const loggy=logger.child({Module:"Queue Event"})

class queueEventEmits{
    constructor(jobRep,minio){
        this.jobRep=jobRep;
        this.minio=minio;
        const io=getIO();
        const queueEvents = new QueueEvents('jobs', { connection });

        queueEvents.on('waiting', ({ jobId }) => {
            loggy.info({jobId:jobId,jobStatus:'Waiting'},`Job ${jobId} WAITING`)
        });
        queueEvents.on('completed', async ({ jobId, returnvalue }) => {
            loggy.info({jobId:jobId,jobStatus:'Completed'},`Job ${jobId} COMPLETED`)
            try{
                jobRep.updateJob(returnvalue.original_path,returnvalue.path)
            }catch(error){
                loggy.error({jobId:jobId,jobStatus:'Failed to update DB'},`Job ${jobId} DB updated failed`)
            }
            try{
                io.to(`Job:${jobId}`).emit("completed",{jobId, url: returnvalue.url})
            }catch(error){
                loggy.error({jobId:jobId,jobStatus:'Failed to send completion status to socket'},`Job ${jobId} completion notification socket failed`)
            }
            
        });

        queueEvents.on('failed',({jobId,failedReason})=>{
            loggy.error({jobId:jobId,err:failedReason},`Job ${jobId} FAILED`)
        });

        queueEvents.on(
            'progress',
            ({ jobId, data }) => {
            // jobId received a progress event
            console.log(`Queue Emitter: Job ${jobId} progress: ${data}`);
            },
            );
        }

        async close() {
            await this.queueEvents.close();
        }
}

export {queueEventEmits}

