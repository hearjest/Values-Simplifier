import dq from '../comm/queue.js'
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import fs from 'fs/promises';

class Job{
    constructor(jobRep,minioClient){
        this.jobRep =jobRep;
        this.minioClient=minioClient;
    }
    /**
     * @param {Integer} userId 
     * @param {Buffer} fileBuffer
     * @param {String} originalName - the file name of img
     * 
     */
    async createJob(userId, fileBuffer, originalName, metadata){
        let uuid = uuidv4();
        const pathForWorker=path.join('./temp', `${uuid}-${originalName}`);
        const pathForStorage=path.join('./temp',`${uuid}-${originalName}`);
        await fs.writeFile(pathForStorage, fileBuffer);
        const jobType=metadata.method
        await this.jobRep.addJob(uuid, userId, pathForWorker,jobType|null);
        const job =await dq.add('process-image',
        {filePath:pathForWorker,
          fileName:originalName,
          uid: uuid,
          meta:metadata,
          userId:userId,
          jobType:jobType
        })
        return {jobId:job.id}
    }

    async getImagesForUser(userId){
        const paths = await this.jobRep.getJobsForUser(userId);
        console.log(paths)
    }
}

export {Job}