import express from 'express';
import routes from './routes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {createServer} from 'http';
import {Server} from 'socket.io'
import {Redis} from 'ioredis'
import {initialize,getIO} from './socket_dot_io.js'
import dotenv from 'dotenv';
dotenv.config();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer=createServer(app);
initialize(httpServer)
let io = getIO();
import './queueStatusEmit.js' //do not move because everything will blow up
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

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../front')));
app.use('/temp2', express.static(path.join(__dirname, '../temp2')));
app.use('/api', routes);
