import inspect
import sys
from bullmq import Worker
from bullmq import Job
import asyncio
import signal

async def process(job, token):
    """Process image jobs from the queue"""
    print(f"Processing job {job.id}")
    print(f"File path: {job.data['filePath']}")
    print(f"File name: {job.data['fileName']}")
    print(f"UID: {job.data['uid']}")
    print(f"Meta: {job.data['meta']}")
    print("HEYYEYEYEYEYEYEY")
    # Add your actual image processing logic here
    # For example: resize, convert, analyze, etc.
    
    return {"status": "completed", "jobId": job.id}

async def main():
    shutdown_event = asyncio.Event()

    def signal_handler(signal, frame):
        print("Signal received, shutting down.")
        shutdown_event.set()

    # Assign signal handlers to SIGTERM and SIGINT
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # Feel free to remove the connection parameter, if your redis runs on localhost
    print("Starting worker...")
    worker = Worker("jobs", process)
    print("wah")
    # Wait until the shutdown event is set
    await shutdown_event.wait()

    # close the worker
    print("Cleaning up worker...")
    await worker.close()
    print("Worker shut down successfully.")

if __name__ == "__main__":
    asyncio.run(main())