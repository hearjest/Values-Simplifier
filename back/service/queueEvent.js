import { QueueEvents } from 'bullmq';
import {getIO} from '../comm/socket_dot_io.js'
import {connection} from '../comm/redisConnection.js'


class queueEventEmits{
    constructor(jobRep,minio){
        this.jobRep=jobRep;
        this.minio=minio;
        const io=getIO();
        const queueEvents = new QueueEvents('jobs', { connection });

        queueEvents.on('waiting', ({ jobId }) => {
            console.log(`Queue Emitter: Job ${jobId} is waiting to be processed!`);
        });
        queueEvents.on('completed', async ({ jobId, returnvalue }) => {
            console.log(`Queue Emitter: Job ${jobId} completed!`);
            console.log(`path is ${returnvalue.path}`)
            console.log(`path is ${returnvalue.original_path}`)
            jobRep.updateJob(returnvalue.original_path,returnvalue.path)
            io.to(`Job:${jobId}`).emit("completed",{jobId, url: returnvalue.url})
        });

        queueEvents.on('failed',({jobId,failedReason})=>{
            console.log(`Queue Emitter: Job ${jobId} failed! Reason: ${failedReason}`);
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

