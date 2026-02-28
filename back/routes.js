import express from 'express';
import multer from 'multer';
import {verifyToken} from './util/jwtVerify.js'
const mem=multer.memoryStorage();
const upload=multer({storage:mem});


function makeRoutes(auth,jobs,health){
  const routes=express.Router();
  routes.get('/checkToken', verifyToken, async(req,res)=>{
    req.log.info({userId:req.user.id}, 'Token verified');
    res.status(200).json({success:true, user:req.user});
 });

//-------------------------------------------
  routes.post('/login', async (req,res)=>{
    try{
      const {userName, password}=req.body;
      req.log.info({userName}, 'Login attempt');
      const result=await auth.login(userName, password);
      if(!result || !result.token){
        req.log.warn({userName}, 'Login failed - invalid credentials');
        return res.status(401).json({message:"Invalid username or password", success:false});
     }
          
      res.cookie('authToken', result.token, {
        httpOnly:true,
        secure:process.env.NODE_ENV === 'production',
        sameSite:'strict',
        maxAge:30 * 60 * 1000,
        path:'/'
     });
      req.log.info({userName}, 'Login successful');
      res.json({message:"Login successful", success:true});
   }catch(err){
      req.log.error({err, userName:req.body.userName}, 'Login error');
      res.status(500).json({message:"failed login"})
   }
 })
//-------------------------------------------
  routes.post('/reg', async (req,res)=>{
    try{
      const {userName,password}=req.body
      req.log.info({userName}, 'Registration attempt');
      const result=await auth.register(userName,password)
      if(result.success){
        req.log.info({userName}, 'Registration successful');
        res.json({message:result.message, success:true});
     }else{
        req.log.warn({userName}, 'Registration failed - user exists');
        res.json({message:"User already exists", success:false});
     }
   }catch(err){
      req.log.error({err, userName:req.body.userName}, 'Registration error');
      res.status(400).json({message:err.message || "Registration failed"})
   }
 })

//-------------------------------------------
  routes.get('/getFiles', verifyToken, async (req,res)=>{
    req.log.info({userId:req.user.id}, 'Fetching user images');
    const result=await jobs.getImagesForUser(req.user.id);
    req.log.info({userId:req.user.id, fileCount:result.length}, 'Images retrieved');
    res.json({message:"Files endpoint", user:req.user, result:result});
 })

//-------------------------------------------
  routes.post('/logout', async (req,res)=>{
    res.clearCookie('authToken', {
      httpOnly:true,
      secure:process.env.NODE_ENV === 'production',
      sameSite:'strict',
      path:'/'
   });
    req.log.info('User logged out');
    res.json({message:"Logged out successfully", success:true});
 })


//-------------------------------------------
  routes.post('/upload', verifyToken, upload.single('img'), async (req, res) => {
    try{
        const userId=req.user.id;
        const fileName=req.file.originalname;
        req.log.info({userId, fileName, fileSize:req.file.size}, 'Upload started');
        if(!userId) {
          req.log.error('User ID not found in token');
          return res.status(401).json({message:'User ID not found in token'});
       }
        let job=await jobs.createJob(
          userId,
          req.file.buffer,
          req.file.originalname,
          req.body,
        );
        req.log.info({userId, fileName, jobId:job.jobId}, 'Upload queued successfully');
        res.json({message:'img in queue now', jobId:job.jobId});
   }catch(e){
      req.log.error({err:e, userId:req.user?.id, fileName:req.file?.originalname}, 'Upload failed');
      res.status(500).json({message:'Error uploading file'});
   }
 });



//-------------------------------------------
  routes.post("/removeImage",verifyToken, async (req,res)=>{
    const fileName=req.body.fileName;
    const userId=req.user.id;
    req.log.info({userId, fileName}, 'Image removal requested');
    let status=await jobs.removeImage(userId, fileName)
    if(status === "success!"){
      req.log.info({userId, fileName}, 'Image removed successfully');
      res.status(200).json({message:"success"})
   }else{
      req.log.error({userId, fileName}, 'Image removal failed');
      res.status(500).json({message:"failed"})
   }
 })

//-------------------------------------------
  routes.get('/checkHealth',async(req,res)=>{
    let report=await health.checkAll();
    req.log.info({healthy:report.healthy, checks:report.checks}, 'Health check performed');
    if(report.healthy){
      res.status(200).json({checks:report.checks})
   }else{
      res.status(500).json({checks:report.checks})
   }
 })
  
  return routes;
}

export {makeRoutes};