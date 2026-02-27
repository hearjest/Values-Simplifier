import express from 'express';
import multer from 'multer';
import {verifyToken} from './util/jwtVerify.js'
const mem = multer.memoryStorage();
const upload = multer({ storage: mem });


function makeRoutes(auth,jobs,health){
  const routes = express.Router();


  routes.get('/checkToken', verifyToken, async(req,res)=>{
    res.status(200).json({ success: true, user: req.user });
  });

  routes.post('/login', async (req,res)=>{
    try{
      const {userName, password}=req.body;
      const result = await auth.login(userName, password);
      if(!result || !result.token){
        return res.status(401).json({message: "Invalid username or password", success: false});
      }
          
      res.cookie('authToken', result.token, {
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

  routes.post('/reg', async (req,res)=>{
    try{
      const {userName,password} = req.body
      const result = await auth.register(userName,password)
      if(result.success){
        res.json({message: result.message, success: true});
      }else{
        res.json({message: "User already exists", success: false});
      }
    }catch(err){
      console.log(err)
      res.status(400).json({message: err.message || "Registration failed"})
    }
  })

  routes.get('/getFiles', verifyToken, async (req,res)=>{
    const result = await jobs.getImagesForUser(req.user.id);

    res.json({message: "Files endpoint", user: req.user, result:result});
  })

  routes.post('/logout', async (req,res)=>{
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
        console.log('req.user:', req.user);
        console.log('userId:', req.user?.id);
        const userId = req.user.id;
        if(!userId) {
          return res.status(401).json({ message: 'User ID not found in token' });
        }
        let job = await jobs.createJob(
          userId,
          req.file.buffer,
          req.file.originalname,
          req.body,
        );
        res.json({ message: 'img in queue now', jobId: job.jobId });
    }catch(e){
      console.error(e);
      res.status(500).json({ message: 'Error uploading file' });
      console.log("FILALIENWEFOWFOEWNFNEVNOIVNE")
    }
  });



  routes.post("/removeImage",verifyToken, async (req,res)=>{
    console.log("reached rutes")
    console.log(req.body)
    let fileName=req.body.fileName;
    let user=req.user.id;
    console.log(`fileName=${fileName}`);
    console.log(`user:${user}`)
    let status= await jobs.removeImage(user,fileName)
    if(status==="success!"){
      res.status(200).json({message:"success"})
    }else{
      res.status(500).json({message:"failed"})
    }
  })

  routes.get('/checkHealth',async(req,res)=>{
    let report=await health.checkAll();
    console.log("report health", report.healthy);
    console.log("report checks",report.checks)
    if(report.healthy){
      res.status(200).json({checks:report.checks})
    }else{
      res.status(500).json({checks:report.checks})
    }
  })
  
  return routes;
}

export {makeRoutes};