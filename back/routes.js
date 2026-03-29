import express from 'express';
//import multer from 'multer';
import {verifyToken} from './util/jwtVerify.js'
import {uploadLimiterrateLimit,loginLimiterrateLimit} from './util/ratelimiters.js'
// const mem=multer.memoryStorage();
// const upload=multer({storage:mem});


function makeRoutes(auth,jobs,health){
  const routes=express.Router();
  routes.get('/checkToken', verifyToken, async(req,res)=>{
    req.log.info({userId:req.user.id}, 'Token verified');
    res.status(200).json({success:true, user:req.user});
 });

//-------------------------------------------
  routes.post('/login', loginLimiterrateLimit, async (req,res)=>{
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
  routes.post('/reg', loginLimiterrateLimit,async (req,res)=>{
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
  routes.post('/upload',uploadLimiterrateLimit, verifyToken, async (req, res) => {
    try{
        const userId=req.user.id;
        if(!userId) {
          req.log.error('User ID not found in token');
          return res.status(401).json({message:'User ID not found in token'});
       }
        const fileName=req.body.fileName;
        req.log.info({userId, fileName, fileSize:req.body.size}, 'Upload started');
        const presigned = await jobs.obtainPresigned({
          "userId":userId,
          "fileName":fileName,
          "mimeType":req.body.mimeType,
          "size":req.body.size,
        })
        console.log("routes",presigned.newPath)
        res.json({message:'Got presigned!',url:presigned.url,newFileName:presigned.newPath,uuid:presigned.uuid});
   }catch(e){
      req.log.error({err:e, userId:req.user?.id, fileName:req.body.fileName}, 'Upload failed');
      res.status(500).json({message:'Error uploading file'});
   }
 });


//-------------------------------------------
routes.post('/upload/job',verifyToken, async(req,res)=>{
  const userId=req.user.id;
  if(!userId) {
    req.log.error('User ID not found in token');
    return res.status(401).json({message:'User ID not found in token'});
  }
  req.log.info({userId:userId},"JOB?!?!??!?!?!?!")
  let job=await jobs.createJob(
          userId,
          req.body.fileName,
          req.body.method,
          req.body.uuid,
          req.body.newFileName,
          req.body.mimetype,
          req.body.size
        );
        req.log.info({userId:userId, fileName:req.body.fileName, jobId:job.jobId}, 'Upload queued successfully');
        res.json({message:'img in queue now', jobId:job.jobId});
})




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
    if(report.healthy){
      res.status(200).json({checks:report.checks})
   }else{
      req.log.warn({healthy:report.healthy, checks:report.checks}, 'Warning');
      res.status(500).json({checks:report.checks})
   }
 })
  
  return routes;
}

export {makeRoutes};