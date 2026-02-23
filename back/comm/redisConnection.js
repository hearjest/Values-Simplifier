import IORedis from 'ioredis'

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

export {connection}