import asyncio
import signal
from bullmq import Worker
import shade_clustering as shade_clustering
import os
from dotenv import load_dotenv, dotenv_values 
import boto3
from processMethodFactory import methodFactory
import json
from io import BytesIO
load_dotenv()
from monitoring.logger import log,structlog
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

async def process(job, token):
        structlog.contextvars.clear_contextvars()
        bucket = os.getenv("S3_BUCKET_NAME")
        jobLogger = log.bind(
            userId=job.data['userId'],
            jobId=job.id,
            bucket=bucket,
        )
        jobType = job.data["jobType"]
        processor = methodFactory.create(jobType)
        await jobLogger.ainfo("Job processing")
        file = None
        try:
            s3_obj = s3.get_object(Bucket=bucket, Key=job.data["newFilePath"])
            file = s3_obj['Body']
            blob = file.read()
            res = processor.process(blob)
            layer = "{}-{}"
            fileName = layer.format(job.data["newFilePath"], "processed")
            objectKey = fileName
            await jobLogger.ainfo("Uploading to bucket", objectKey=objectKey)
            out_bytes = res["outputted_bytes"]
            s3.put_object(
                Bucket=bucket,
                Key=objectKey,
                Body=BytesIO(out_bytes),
                ContentType=res.get("content_type", "image/png"),
            )
            region = os.getenv("AWS_REGION")
            s3.delete_object(Bucket=bucket,Key=job.data["newFilePath"])
            presigned_url = s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': bucket, 'Key': objectKey},
                ExpiresIn=900
            )
            result = {
                "status": "completed",
                "jobId": job.id,
                "path": objectKey,
                "original_path": job.data["originalFilePath"],
                "url": presigned_url,
                "userId": job.data['userId'],
                "preProcessedPath": job.data["newFilePath"]
            }
            return result
        except Exception as e:
            await jobLogger.aerror("Job processing failed", exception=str(e))
            return None
        finally:
            if file:
                file.close()

async def main():
    shutdown_event = asyncio.Event()
    def signal_handler(sig, frame):
        print("Signal received, shutting down.")
        shutdown_event.set()

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    bucket = os.getenv("S3_BUCKET_NAME", "processed")
    try:
        s3.head_bucket(Bucket=bucket)
    except Exception as e:
        print(f"Error: S3 bucket {bucket} does not exist or is not accessible: {e}")
    
    redis_host = os.getenv("REDIS_HOST", "redis")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    
    print(f"Connecting to Redis at {redis_host}:{redis_port}")
    connection_opts = {
        "host": redis_host,
        "port": redis_port,
    }
    
    print("Starting worker, please wait")
    worker = Worker("jobs", process, {
        "connection": connection_opts,
        "lockDuration": 600000, 
    })
    print("Worker is online")
    
    await shutdown_event.wait()

    print("Cleaning up worker")
    await worker.close()
    print("Worker shut down successfully.")

if __name__ == "__main__":
    asyncio.run(main())
