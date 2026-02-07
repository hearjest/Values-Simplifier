import { QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ maxRetriesPerRequest: null });//queuevents cant reuse connection from queue.js bc block connection so DONT TOUCH
const queueEvents = new QueueEvents('jobs', { connection });

queueEvents.on('waiting', ({ jobId }) => {
    console.log(`Queue Emitter: Job ${jobId} is waiting to be processed!`);
});

queueEvents.on('completed', ({ jobId }) => {
  // Called every time a job is completed in any worker.
  console.log(`Queue Emitter: Job ${jobId} completed!`);
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