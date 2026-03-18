import * as Minio from 'minio'
import dotenv from 'dotenv'

dotenv.config();


const publicUrl = new URL(process.env.MINIO_PUBLIC_URL); // "http://localhost:9000"

const minioClient = (()=>{
  try{ 
    return new Minio.Client({ 
    endPoint: "minio",
    port: parseInt(publicUrl.port) || 9000,
    useSSL: publicUrl.protocol==='https:',
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
     })
  }catch(error){
    console.error(error)
    console.log("Failed to connect to minio")
  }
  
})();

const minPubCli = (()=>{
  try{ 
    return new Minio.Client({ 
    endPoint: "localhost",   // "localhost"
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER,
    secretKey: process.env.MINIO_ROOT_PASSWORD,
    region: 'us-east-1',  
     })
  }catch(error){
    console.error(error)
    console.log("Failed to connect to minio")
  }
  
})();

export{minioClient,minPubCli}