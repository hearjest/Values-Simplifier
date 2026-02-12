import express from 'express';
const routes = express.Router();
import multer from 'multer';
import dq from './queue.js';
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import {reg,login,verifyToken} from './auth/UserFunctions.js'
import {addJob} from './db.js'
import {jwtDecode} from 'jwt-decode'
const mem = multer.memoryStorage();
const upload = multer({ storage: mem });


routes.post('/login', login, async (req,res)=>{
  try{
    res.cookie('authToken', req.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000,
      path: '/'
    });
    res.json({message: "Login successful", success: true});
  }catch(err){
    console.log(err)
    res.status(500).json({message:"failed login"})
  }
})

routes.post('/reg', reg, async (req,res)=>{
  try{
    if(req.message == "registered"){
      res.json({message:"registered", success: true});
    }else{
      res.json({message:"User already exists", success: false});
    }
  }catch(err){
    console.log(err)
    res.status(500).json({message:"Registration failed"})
  }
})

routes.get('/getFiles', verifyToken, async (req,res)=>{
  res.json({message: "Files endpoint", user: req.user});
})

routes.post('/logout', async (req,res)=>{
  // Clear the auth cookie
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.json({message: "Logged out successfully", success: true});
})


routes.post('/upload', verifyToken, upload.single('img'), async (req, res) => {
  try{
    const uid=uuidv4();
      const tempPath= path.join('./temp', `${uid}-${req.file.originalname}`);
      await fs.writeFile(tempPath, req.file.buffer);
      const id = jwtDecode(req.cookies.authToken).id
      await addJob(uid,id,tempPath)
      const job = await dq.add('process-image',
        {filePath:tempPath,
          fileName:req.file.originalname,
          uid: uid,
          meta:req.body
        })

      res.json({ message: 'img in queue now', jobId: job.id });
  }catch(e){
    console.error(e);
    res.status(500).json({ message: 'Error uploading file' });
    console.log("FILALIENWEFOWFOEWNFNEVNOIVNE")
  }
  
  

});



export default routes;