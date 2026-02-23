import {Queue} from 'bullmq'
//import IORedis from 'ioredis';
import {connection} from './redisConnection.js'
//const connection = new IORedis();

const dq = (()=>{
  try{
    return new Queue('jobs',{
    connection
  })
  }catch(error){
    console.error(error)
    console.log("Failed to connect to redis")
  }
    
})();
export default dq