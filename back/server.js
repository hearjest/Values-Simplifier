import express from 'express';
import routes from './routes.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {createServer} from 'http';
import {Server} from 'socket.io'
import {Redis} from 'ioredis'
import {initialize,getIO} from './socket_dot_io.js'
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer=createServer(app);
initialize(httpServer)
let io = getIO();
import './queueStatusEmit.js'
httpServer.listen(PORT,()=>{
  console.log("listening. using httpServer. ")
})

io.on("connection",(socket)=>{
  console.log("a user is connected")
  socket.on("subTo",(jobId)=>{
    socket.join(`Job:${jobId}`)
    console.log("socket joined ",jobId)
  })
})

app.use(cors());
app.use(express.static(path.join(__dirname, '../front')));
app.use('/api', routes);
