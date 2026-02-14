import { QueueEvents } from 'bullmq';
import {getIO} from '../socket_dot_io.js'
import {connection} from '../redisConnection.js'


class queueEventEmits{
    constructor(jobRep){
        this.jobRep=jobRep;
        const io=getIO();
        const queueEvents = new QueueEvents('jobs', { connection });
        queueEvents.on('waiting', ({ jobId }) => {
            console.log(`Queue Emitter: Job ${jobId} is waiting to be processed!`);
        });
        queueEvents.on('completed', async ({ jobId, returnvalue }) => {
            // Called every time a job is completed in any worker.
            console.log(`Queue Emitter: Job ${jobId} completed!`);
            console.log(`path is ${returnvalue.path}`)
            console.log(`path is ${returnvalue.original_path}`)
            jobRep.updateJob(returnvalue.original_path,returnvalue.path)
            io.to(`Job:${jobId}`).emit("completed",{jobId, path: returnvalue.path})
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



class queueEventEmitter{
    constructor(sql){
        this.sql=sql
    }
    
}