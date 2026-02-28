import express from 'express';
import {makeRoutes} from './routes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {createServer} from 'http';
import {initialize,getIO} from './comm/socket_dot_io.js'
import {sql} from './comm/dbConnection.js'
import dq from './comm/queue.js'
import {minioClient} from './comm/minioConn.js'
import dotenv from 'dotenv';
import { UserRepo } from './repos/userRep.js';
import { jobRepo } from './repos/jobRep.js';
import { generalAuth } from './service/usersLogReg.js';
import { Job } from './service/job.js';
import {queueEventEmits} from './service/queueEvent.js'
import {health} from './monitoring/healthCheck.js'
import {connection} from './comm/redisConnection.js'
import pinoHttp from 'pino-http'
import {logger} from './monitoring/logger.js'
import {asyncStorage} from './monitoring/context.js'
import { v4 as uuidv4 } from 'uuid';
dotenv.config();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const httpServer=createServer(app);
initialize(httpServer)

let io = getIO();
httpServer.listen(PORT,()=>{
  logger.info({port:PORT},"listening. using httpServer. go to http://localhost:3000/ . Waait for Worker and docker containers to come online")
})

io.on("connection",(socket)=>{
  logger.info("a user is connected")
  socket.on("subTo",(jobId)=>{
    socket.join(`Job:${jobId}`)
    logger.info({jobId},'socket joined')
  })
})

const userrep=new UserRepo(sql);
const jobrep=new jobRepo(sql);
const auth=new generalAuth(userrep);
const jobs=new Job(jobrep,minioClient);
const queueEventEmitter=new queueEventEmits(jobrep,minioClient);
app.use((req, res, next) =>{
  const requestId = uuidv4();
  req.id = requestId;
  asyncStorage.run({requestId}, () => {
    next();
  });
});
app.use(pinoHttp({
  logger,
  autoLogging:false,
  customProps: (req) => ({
    requestId: req.id
  }),
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url
    }),
    res: (res) => ({
      statusCode: res.statusCode
    })
  }
}));
app.use(cors({
  origin:""+process.env.SERVER_HOST+':'+process.env.PORT,
  credentials:true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../front')));
app.use('/temp2', express.static(path.join(__dirname, '../temp2')));
app.use('/api', makeRoutes(auth,jobs,new health(sql,minioClient,connection,dq)))