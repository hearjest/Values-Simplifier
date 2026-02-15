import inspect
import sys
import asyncio
import signal
from redis import Redis
from bullmq import Worker, Job
import shade_clustering
import os
from dotenv import load_dotenv, dotenv_values 
import requests
from minio import Minio
from minio.error import S3Error
import cv2

load_dotenv();

client = Minio("localhost:9000",
    access_key=os.getenv("MINIO_USER"),
    secret_key=os.getenv("MINIO_PASS"),
    secure=False
)

async def process(job, token):
    print(client.list_objects("processed"))
    """Process image jobs from the queue"""
    print(f"Processing job {job.id}")
    print(f"File path: {job.data['filePath']}")
    print(f"File name: {job.data['fileName']}")
    print(f"UID: {job.data['uid']}")
    print(f"Meta: {job.data['meta']}")
    print("HEYYEYEYEYEYEYEY")
    res = shade_clustering.cluster_shades(job.data['filePath'], './temp2')
    print("hiferervevrer")
    bucket = os.getenv("MINIO_BUCKET1");
    print(bucket)
    layer="{}-{}"
    fileName=layer.format(job.data['userId'],job.data["fileName"])
    pathDes="{}/{}"
    formattedPath=pathDes.format(bucket,fileName)
    print("bruh")
    print(client.bucket_exists(bucket));
    print("overeherehehehe")
    if client.bucket_exists(bucket):
        try:
            result = client.fput_object(bucket,formattedPath,res['clustered_gray'])    
            print(result)
        except S3Error as e:
            print(f"Failed to upload: {e}")
        
    print("hey!")
    presigned = client.get_presigned_url("GET",bucket,formattedPath)
    
    return {"status": "completed", "jobId": job.id,"path":res['clustered_gray'],"original_path":res['input'],"url":presigned}

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
