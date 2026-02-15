import dq from '../comm/queue.js'
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import fs from 'fs/promises';

class Job{
    constructor(jobRep){
        this.jobRep =jobRep;
    }
    /**
     * @param {Integer} userId 
     * @param {Buffer} fileBuffer
     * @param {String} originalName - the file name of img
     * 
     */
    async createJob(userId, fileBuffer, originalName, metadata){
        console.log('Job.createJob called with:');
        console.log('  userId:', userId);
        console.log('  originalName:', originalName);
        console.log('  metadata:', metadata);
        console.log("job type",metadata.method)
        let uuid = uuidv4();
        const pathForWorker=path.join('./temp', `${uuid}-${originalName}`);
        const pathForStorage=path.join('./temp',`${uuid}-${originalName}`);
        await fs.writeFile(pathForStorage, fileBuffer);
        const jobType=metadata.method
        console.log('About to call addJob with:', {uuid, userId, pathForWorker});
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
}

export {Job}