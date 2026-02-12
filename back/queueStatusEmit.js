import { QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import {getIO} from './socket_dot_io.js'
import {updateJob} from './db.js'
const connection = new IORedis({ maxRetriesPerRequest: null });//queuevents cant reuse connection from queue.js bc block connection so DONT TOUCH
const queueEvents = new QueueEvents('jobs', { connection });



queueEvents.on('waiting', ({ jobId }) => {
    console.log(`Queue Emitter: Job ${jobId} is waiting to be processed!`);
});

queueEvents.on('completed', async ({ jobId, returnvalue }) => {
  let io = getIO();
  // Called every time a job is completed in any worker.
  console.log(`Queue Emitter: Job ${jobId} completed!`);
  console.log(`path is ${returnvalue.path}`)
  console.log(`path is ${returnvalue.original_path}`)
  await updateJob(returnvalue.original_path,returnvalue.path)
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