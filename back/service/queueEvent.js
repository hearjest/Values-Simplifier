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
            loggy.info({jobId,jobStatus:'Completed'},`Job ${jobId} COMPLETED`)
            const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
            console.log("result",result)
            try{
                await jobRep.updateJob(result.original_path,result.path,result.jobType)
            }catch(error){
                loggy.error({
                    jobId,
                    jobStatus: 'Failed to update DB',
                    original_path: result.original_path,
                    processed_path: result.path,
                    jobType: result.jobType,
                    error
                }, `Job ${jobId} DB update failed`)
            }
            try{
                await connection.del(`users:${result.userId}:urls`);
                await connection.del(`users:${result.userId}:urls:img`);
                await connection.del(`users:${result.userId}:urls:subs`);
                await connection.del(`users:${result.userId}:urls:subtitle`);
            }catch(error){
                loggy.error({jobId:jobId,jobStatus:"Failed to delete key in redis",error:error})
            }
            try{
                const roomId = result.videoId || result.preProcessedPath || jobId;
                io.to(`Job:${roomId}`).emit("completed", {
                    jobId,
                    url: result.url,
                    videoId: result.videoId,
                    oldFilePath: result.preProcessedPath,
                })
            }catch(error){
                loggy.error({jobId:jobId,jobStatus:'Failed to send completion status to socket',error:error},`Job ${jobId} completion notification socket failed`)
            }
            
        });

        queueEvents.on('failed',({jobId,failedReason})=>{
            loggy.error({jobId:jobId,err:failedReason},`Job ${jobId} FAILED`)
            io.to(`Job:${jobId}`).emit("failed",{jobId})
        });

        queueEvents.on('progress', ({ jobId, data }) => {
            const payload = typeof data === 'string' ? { event: data, percent: null, message: data } : data;
            const roomId = payload.roomId || jobId;
            io.to(`Job:${roomId}`).emit('progress', { jobId, ...payload });
        });
        }

        async close() {
            await this.queueEvents.close();
        }
}

export {queueEventEmits}

