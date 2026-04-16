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
import yt_dlp
from faster_whisper import WhisperModel

def hrMinSecMsConvertFromSec(seconds):
    hrs=int(seconds*(1/60)*(1/60))
    mins=int((seconds%(60*60))/60)
    secs=int(seconds%60)
    ms=int((seconds%1)*1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"

async def process(job, token):
        match job.data["jobType"]:
            case 'subtitle':
                log.info('SubtitlesCase')
                return await makeSubtitles(job)
            case 'imageProcess':
                log.info('Process Image')
                return await processImage(job,token)

                
        


async def processImage(job, token):
        structlog.contextvars.clear_contextvars()
        bucket = os.getenv("S3_BUCKET_NAME")
        jobLogger = log.bind(
            userId=job.data['userId'],
            jobId=job.id,
            bucket=bucket,
        )
        processor = methodFactory.create(job.data["method"])
        await jobLogger.ainfo("Job processing")
        await job.updateProgress("processBegin")
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
            
            await job.updateProgress("bucketUpload")
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
                "preProcessedPath": job.data["newFilePath"],
                "jobType":"img"
            }
            return result
        except Exception as e:
            await jobLogger.aerror("Job processing failed", exception=str(e))
            return None
        finally:
            if file:
                file.close()



#------------------------------------------------------------------------------------------



async def makeSubtitles(job):
    structlog.contextvars.clear_contextvars()
    bucket = os.getenv("S3_BUCKET_NAME")
    jobLogger = log.bind(
        userId=job.data['userId'],
        jobId=job.id,
        bucket=bucket,
    )
    await jobLogger.ainfo("Job processing")
    await job.updateProgress("downloadingVideo")
    url=job.data["url"]
    ydl_opts = {
        'cookiefile': 'cookies.txt',
        'verbose': True,
        'format': 'bestaudio/best',
        "outtmpl":"/tmp/%(id)s.%(ext)s",
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
        }],
        'extractor_args': {
            'youtube': {
                'player_client': ['android_vr'],
            },
            'getpot_bgutil_http': {
                'base_url': [os.getenv('BGUTIL_URL', 'http://bgutil:4416')],
            },
        },
        'compat_opts': set(),
        'http_headers': {},
}
    title=''
    id=(url.split('v='))[1]
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ins=ydl.extract_info(url,download=False)
        downla =ydl.download([url])
        title="/tmp/"+id+".mp3"
    await job.updateProgress("extractedAudio")
    model_size = "base"
    model = WhisperModel(model_size, device="cpu", compute_type="default", use_auth_token=os.getenv('HF_TOKEN'), download_root='/app/models')
    await job.updateProgress("Running model on audio")
    segments, info = model.transcribe(title, beam_size=5,vad_filter=True,language="ja",task="transcribe")
    i=1;
    subs=[]
    await job.updateProgress("creatingSubtitles")
    for segment in segments:
        timeStart=hrMinSecMsConvertFromSec(segment.start);
        timeEnd=hrMinSecMsConvertFromSec(segment.end)
        time=f"{i}\n{timeStart} --> {timeEnd}\n{segment.text.strip()}\n"
        i=i+1; 
        subs.append(time)
        print("[%.2fs -> %.2fs] %s" % (segment.start, segment.end, segment.text))
    srtFileName = id + ".srt"
    body="\n".join(subs);
    bodyByte=body.encode('utf-8')
    with open(srtFileName,"w",encoding="utf-8") as f:
        f.write(body)
    s3.put_object(
                Bucket=bucket,
                Key=srtFileName,
                Body=BytesIO(bodyByte),
                ContentType="text/plain; charset=utf-8",
            )
    await job.updateProgress("uplaodedSubtitle")
    presigned_url = s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': bucket, 'Key': srtFileName},
                ExpiresIn=900
            ) 
    if(os.path.exists(title)):
        os.remove(srtFileName)
        os.remove(title)
    result = {
        "status": "completed",
        "jobId": job.id,
        "original_path": url,
        "url": presigned_url,
        "userId": job.data['userId'],
        "preProcessedPath": job.data["url"],
        "path":srtFileName,
        "videoId":job.data["videoId"],
        "jobType":"subs"
    } 
    return result









async def main():
    shutdown_event = asyncio.Event()
    def signal_handler(sig, frame):
        print(f"Signal {sig} ({signal.Signals(sig).name}) received, shutting down.")
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
    
    try:
        await shutdown_event.wait()
    finally:
        print("Cleaning up worker")
        await worker.close()
        print("Worker shut down successfully.")

if __name__ == "__main__":
    asyncio.run(main())
