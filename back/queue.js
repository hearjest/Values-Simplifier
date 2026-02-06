import {Queue} from 'bullmq'

const dq = new Queue('jobs',{
  connection:{host:'localhost',port:6379}
})

export default dq