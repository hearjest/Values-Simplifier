import inspect
import sys
import asyncio
import signal
from redis import Redis
from bullmq import Worker, Job

async def process(job, token):
    """Process image jobs from the queue"""
    print(f"Processing job {job.id}")
    print(f"File path: {job.data['filePath']}")
    print(f"File name: {job.data['fileName']}")
    print(f"UID: {job.data['uid']}")
    print(f"Meta: {job.data['meta']}")
    print("HEYYEYEYEYEYEYEY")
    

    
    return {"status": "completed", "jobId": job.id}

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
