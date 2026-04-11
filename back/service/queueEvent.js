import { QueueEvents } from 'bullmq';
import {getIO} from '../comm/socket_dot_io.js'
import {connection} from '../comm/redisConnection.js'
import {logger} from '../monitoring/logger.js'
const loggy=logger.child({Module:"Queue Event"})

class queueEventEmits{
    constructor(jobRep){
        this.jobRep=jobRep;
        const io=getIO();
        const queueEvents = new QueueEvents('jobs', { connection });

        queueEvents.on('waiting', ({ jobId }) => {
            loggy.info({jobId:jobId,jobStatus:'Waiting'},`Job ${jobId} WAITING`)
        });
        queueEvents.on('completed', async ({ jobId, returnvalue }) => {
            loggy.info({jobId:jobId,jobStatus:'Completed'},`Job ${jobId} COMPLETED`)
            try{
                jobRep.updateJob(returnvalue.original_path,returnvalue.path,returnvalue.jobType)
            }catch(error){
                loggy.error({jobId:jobId,jobStatus:'Failed to update DB',error:error},`Job ${jobId} DB updated failed`)
            }
            try{
                await connection.del(`users:${returnvalue.userId}:urls`);
                await connection.del(`users:${returnvalue.userId}:urls:img`);
                await connection.del(`users:${returnvalue.userId}:urls:subs`);
                await connection.del(`users:${returnvalue.userId}:urls:subtitle`);
            }catch(error){
                loggy.error({jobId:jobId,jobStatus:"Failed to delete key in redis",error:error})
            }
            try{
                const roomId = returnvalue.videoId || returnvalue.preProcessedPath || jobId;
                console.log("returnvalue", returnvalue.videoId);
                io.to(`Job:${roomId}`).emit("completed", {
                    jobId,
                    url: returnvalue.url,
                    videoId: returnvalue.videoId,
                    oldFilePath: returnvalue.preProcessedPath,
                })
            }catch(error){
                loggy.error({jobId:jobId,jobStatus:'Failed to send completion status to socket',error:error},`Job ${jobId} completion notification socket failed`)
            }
            
        });

        queueEvents.on('failed',({jobId,failedReason})=>{
            loggy.error({jobId:jobId,err:failedReason},`Job ${jobId} FAILED`)
            io.to(`Job:${jobId}`).emit("failed",{jobId})
        });

        queueEvents.on(
            'progress',
            ({ jobId, data }) => {
            console.log(`Queue Emitter: Job ${jobId} progress: ${data}`);
            io.to(`Job:${jobId}`).emit(data.msg,{jobId})
            },
            );
        }

        async close() {
            await this.queueEvents.close();
        }
}

export {queueEventEmits}

