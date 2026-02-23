import * as Minio from 'minio'
import dotenv from 'dotenv'

dotenv.config();

const minioClient = (()=>{
  try{
    return new Minio.Client({
    endPoint: process.env.MINIO_HOST,
    port: process.env.MINIO_PORT,
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
     })
  }catch(error){
    console.error(error)
    console.log("Failed to connect to minio")
  }
  
})();

export{minioClient}