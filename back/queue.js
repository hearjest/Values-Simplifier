import {Queue} from 'bullmq'
import IORedis from 'ioredis';

const connection = new IORedis();

const dq = new Queue('jobs',{
  connection
})

export default dq