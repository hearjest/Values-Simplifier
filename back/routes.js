import express from 'express';
const routes = express.Router();
import multer from 'multer';
import dq from './queue.js';
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import fs from 'fs/promises';

const mem = multer.memoryStorage();
const upload = multer({ storage: mem });


routes.post('/upload', upload.single('img'), async (req, res) => {
  try{
    const uid=uuidv4();
      const tempPath= path.join('./temp', `${uid}-${req.file.originalname}`);
      await fs.writeFile(tempPath, req.file.buffer);
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