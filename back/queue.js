import {Queue} from 'bullmq'
// import IORedis from 'ioredis';
import {connection} from './redisConnection.js'
// const connection = new IORedis();

const dq = new Queue('jobs',{
  connection
})

export default dq