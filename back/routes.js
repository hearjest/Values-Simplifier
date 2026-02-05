import express from 'express';
const routes = express.Router();
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
routes.post('/upload', upload.single('img'), (req, res) => {
  
  console.log(req.file);
  console.log(req.body);
  res.json({ message: 'File uploaded successfully', file: req.file });

});



export default routes;