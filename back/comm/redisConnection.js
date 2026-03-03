import IORedis from 'ioredis'

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});



connection.defineCommand('getCachedUrls',{
  numberOfKeys:1,
  lua:`local val=redis.call("GET",KEYS[1]) 
  if val then 
    return val
  else
    return false
  end`
})



export {connection}