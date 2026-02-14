import dq from '../queue.js'
import {v4 as uuidv4} from 'uuid';
import path from 'path';
import fs from 'fs/promises';

class Job{
    constructor(jobRep){
        this.jobRep =jobRep;
    }

    async createJob(userId, fileBuffer, originalName, metadata){
        console.log('Job.createJob called with:');
        console.log('  userId:', userId);
        console.log('  originalName:', originalName);
        console.log('  metadata:', metadata);
        
        let uuid = uuidv4();
        const pathForWorker=path.join('./temp', `${uuid}-${originalName}`);
        const pathForStorage=path.join('./temp',`${uuid}-${originalName}`);
        await fs.writeFile(pathForStorage, fileBuffer);
        
        console.log('About to call addJob with:', {uuid, userId, pathForWorker});
        await this.jobRep.addJob(uuid, userId, pathForWorker);
        const job =await dq.add('process-image',
        {filePath:pathForWorker,
          fileName:originalName,
          uid: uuid,
          meta:metadata
        })

        return {jobId:job.id}
    }
}

export {Job}