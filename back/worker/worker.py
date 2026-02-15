import inspect
import sys
import asyncio
import signal
from bullmq import Worker
import shade_clustering as shade_clustering
import os
from dotenv import load_dotenv, dotenv_values 
from minio import Minio
from minio.error import S3Error
from processMethodFactory import methodFactory

load_dotenv();

client = Minio("localhost:9000",
    access_key=os.getenv("MINIO_USER"),
    secret_key=os.getenv("MINIO_PASS"),
    secure=False
)

async def process(job, token):
    print(f"Worker: BEGIN Job {job.id} from User {job.data['userId']}");
    jobType=job.data["jobType"]
    processor = methodFactory.create(jobType)
    res = processor.process(job)

    #res = shade_clustering.cluster_shades(job.data['filePath'], '../temp2')
    bucket = os.getenv("MINIO_BUCKET1");
    layer="{}-{}"
    fileName=layer.format(job.data['userId'],job.data["fileName"])
    pathDes="{}/{}"
    formattedPathInBucket=pathDes.format(bucket,fileName)
    if client.bucket_exists(bucket):
        try:
            result = client.fput_object(bucket,formattedPathInBucket,res['clustered_gray'])    
        except S3Error as e:
            print(f"Failed to upload: {e}")
    presigned = client.get_presigned_url("GET",bucket,formattedPathInBucket)
    print(f"Worker: FINISH Job {job.id} from User {job.data['userId']}");
    return {"status": "completed", "jobId": job.id,"path":formattedPathInBucket,"original_path":res['input'],"url":presigned}

async def main():
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        print("Signal received, shutting down.")
        shutdown_event.set()

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    print("Starting worker...")
    worker = Worker("jobs", process, {"host": "localhost", "port": 6379})
    print("Worker started and listening for jobs...")
    
    await shutdown_event.wait()

    print("Cleaning up worker...")
    await worker.close()
    print("Worker shut down successfully.")

if __name__ == "__main__":
    asyncio.run(main())
