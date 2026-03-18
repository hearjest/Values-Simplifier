// import crypto from 'node:crypto'

// class Chunker{
//     constructor(){

//     }

//     /**
//      * @param {File} file
//      */
//     async chunk(file){
//         const chunkSizeEach=5*1024*1024; //5242880 bytes (5mb)
//         const fileSize=file.size;
//         const totalChunks=Math.ceil(fileSize/chunkSizeEach)
//         const chunked=[]
//         for(let i=0;i<totalChunks;i++){
//             const startInd=i*chunkSizeEach;
//             const endInd=Math.min(fileSize,startInd+chunkSizeEach)
//             const chunk=file.slice(startInd,endInd);
//             const hashed=await this.hashTheChunk(chunk);
//             const chunkId=`${file.name}-${hashed}`
//             chunked.push({
//                 chunk:chunk,
//                 chunkId:chunkId
//             })
//         }
//         return chunked
//     }

//     /**
//      * @param {Blob} chunk
//      */
//     async hashTheChunk(chunk){
//         const buff=await chunk.arrayBuffer();
//         const hexed=await crypto.createHash('SHA256').update(buff).digest('hex')
//         return hexed
//     }
// }