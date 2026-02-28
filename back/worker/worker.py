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
from redis.asyncio import Redis
import json
load_dotenv()
from monitoring.logger import log,structlog

minio_host = os.getenv("MINIO_HOST", "localhost")
minio_port = os.getenv("MINIO_PORT", "9000")

client = Minio(f"{minio_host}:{minio_port}",
    access_key=os.getenv("MINIO_ROOT_USER"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD"),
    secure=False
)

async def process(job, token):
    structlog.contextvars.clear_contextvars()
    bucket = os.getenv("MINIO_BUCKET1");
    jobLogger = log.bind(
        userId=job.data['userId'],
        jobId=job.id,
        bucket=bucket,
    )
    jobType=job.data["jobType"]
    processor = methodFactory.create(jobType)
    
    await jobLogger.ainfo("Job processing")
    try:
        res = processor.process(job)
    except:
        await jobLogger.error("Job processing failed")

    layer="{}-{}"
    fileName=layer.format(job.data['userId'],job.data["fileName"])
    objectKey = fileName

    await jobLogger.ainfo("Uploading to bucket",objectKey=objectKey);
    try:
        result = client.fput_object(bucket, objectKey, res['clustered_gray'])    
    except S3Error as e:
        jobLogger.ainfo("Failed to upload", exception=e)
    
    puburl = os.getenv("MINIO_PUBLIC_URL", f"http://localhost:{minio_port}")
    directurl = f"{puburl}/{bucket}/{objectKey}"
    await jobLogger.ainfo('')
    return {"status": "completed", "jobId": job.id,"path": objectKey,"original_path":res['input'],"url":directurl}

async def main():
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        print("Signal received, shutting down.")
        shutdown_event.set()

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    bucket = os.getenv("MINIO_BUCKET1", "processed")
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            print(f"Created bucket: {bucket}")
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket}/*"]
                }
            ]
        }
        client.set_bucket_policy(bucket, json.dumps(policy))
    except Exception as e:
        print(f"Error setting up bucket: {e}")
    
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    
    print(f"Connecting to Redis at {redis_host}:{redis_port}")
    redis_connection = Redis(host=redis_host, port=redis_port, decode_responses=True)
    
    print("Starting worker, please wait")
    worker = Worker("jobs", process, {"connection": redis_connection})
    print("Worker is online.")
    
    await shutdown_event.wait()

    print("Cleaning up worker")
    await worker.close()
    print("Worker shut down successfully.")

if __name__ == "__main__":
    asyncio.run(main())
