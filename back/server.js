import express from 'express';
import {makeRoutes} from './routes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {createServer} from 'http';
import {initialize,getIO} from './comm/socket_dot_io.js'
import {sql} from './comm/dbConnection.js'
import {minioClient} from './comm/minioConn.js'
import dotenv from 'dotenv';
import { UserRepo } from './repos/userRep.js';
import { jobRepo } from './repos/jobRep.js';
import { generalAuth } from './service/usersLogReg.js';
import { Job } from './service/job.js';
import {queueEventEmits} from './service/queueEvent.js'
dotenv.config();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer=createServer(app);
initialize(httpServer)

let io = getIO();
httpServer.listen(PORT,()=>{
  console.log("listening. using httpServer. go to http://localhost:3000/")
})

io.on("connection",(socket)=>{
  console.log("a user is connected")
  socket.on("subTo",(jobId)=>{
    socket.join(`Job:${jobId}`)
    console.log("socket joined ",jobId)
  })
})

const userrep=new UserRepo(sql);
const jobrep=new jobRepo(sql);
const auth=new generalAuth(userrep);
const jobs=new Job(jobrep);
const queueEventEmitter=new queueEventEmits(jobrep,minioClient);
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../front')));
app.use('/temp2', express.static(path.join(__dirname, '../temp2')));
app.use('/api', makeRoutes(auth,jobs));
