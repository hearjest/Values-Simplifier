// const DEFAULT_PART_SIZE = 5 * 1024 * 1024;
// const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 15 * 60;

// class uploady {
//     constructor(minioClient, db, opts = {}) {
//         this.mini = minioClient;
//         this.db = db || null;
//         this.bucketName = opts.bucketName || process.env.MINIO_BUCKET1;
//         this.partSize = opts.partSize || DEFAULT_PART_SIZE;
//         this.urlExpirySeconds = opts.urlExpirySeconds || DEFAULT_SIGNED_URL_EXPIRY_SECONDS;
//     }

//     async initMultipartUpload({ userId, fileName, fileSize, contentType, method }) {
//         const objectName = this.#buildObjectName(userId, fileName);
//         const uploadId = await this.#callFirstAvailableMethod([
//             {
//                 name: 'createMultipartUpload',
//                 args: [this.bucketName, objectName, { 'Content-Type': contentType || 'application/octet-stream' }]
//             },
//             {
//                 name: 'initiateNewMultipartUpload',
//                 args: [this.bucketName, objectName, { 'Content-Type': contentType || 'application/octet-stream' }]
//             },
//             {
//                 name: 'initiateMultipartUpload',
//                 args: [this.bucketName, objectName, { 'Content-Type': contentType || 'application/octet-stream' }]
//             }
//         ]);

//         const totalParts = Math.ceil(Number(fileSize) / this.partSize);

//         await this.#persistChunkStatus({
//             uploadId,
//             objectName,
//             partNumber: 0,
//             status: 'initiated',
//             chunkId: null,
//             etag: null,
//             hash: null,
//             size: Number(fileSize) || 0,
//             method
//         });

//         return {
//             bucketName: this.bucketName,
//             objectName,
//             uploadId,
//             partSize: this.partSize,
//             totalParts
//         };
//     }

//     async signPartUpload({ uploadId, objectName, partNumber }) {
//         const url = await this.mini.presignedUrl(
//             'PUT',
//             this.bucketName,
//             objectName,
//             this.urlExpirySeconds,
//             {
//                 uploadId,
//                 partNumber
//             }
//         );

//         return {
//             url,
//             partNumber,
//             expiresIn: this.urlExpirySeconds
//         };
//     }

//     async confirmUploadedPart({ uploadId, objectName, partNumber, etag, chunkId, hash, size }) {
//         const normalizedEtag = this.#normalizeEtag(etag);
//         const result = await this.#getUploadedPart(uploadId, objectName, Number(partNumber));

//         if (!result.found) {
//             await this.#persistChunkStatus({
//                 uploadId,
//                 objectName,
//                 partNumber,
//                 status: 'missing',
//                 chunkId,
//                 etag: normalizedEtag,
//                 hash,
//                 size
//             });
//             throw new Error(`Part ${partNumber} not found in MinIO for upload ${uploadId}`);
//         }

//         if (normalizedEtag && this.#normalizeEtag(result.part.etag) !== normalizedEtag) {
//             await this.#persistChunkStatus({
//                 uploadId,
//                 objectName,
//                 partNumber,
//                 status: 'etag-mismatch',
//                 chunkId,
//                 etag: normalizedEtag,
//                 hash,
//                 size
//             });
//             throw new Error(`ETag mismatch for part ${partNumber}`);
//         }

//         await this.#persistChunkStatus({
//             uploadId,
//             objectName,
//             partNumber,
//             status: 'verified',
//             chunkId,
//             etag: this.#normalizeEtag(result.part.etag),
//             hash,
//             size: result.part.size ?? size
//         });

//         return {
//             success: true,
//             partNumber: Number(partNumber),
//             etag: this.#normalizeEtag(result.part.etag),
//             size: result.part.size
//         };
//     }

//     async completeMultipartUpload({ uploadId, objectName, parts, method, userId }) {
//         const cleanedParts = (parts || [])
//             .map((part) => ({
//                 part: Number(part.part),
//                 etag: this.#normalizeEtag(part.etag)
//             }))
//             .sort((a, b) => a.part - b.part);

//         if (cleanedParts.length === 0) {
//             throw new Error('No parts provided for completion');
//         }

//         await this.#callFirstAvailableMethod([
//             {
//                 name: 'completeMultipartUpload',
//                 args: [this.bucketName, objectName, uploadId, cleanedParts]
//             },
//             {
//                 name: 'completeMultipart',
//                 args: [this.bucketName, objectName, uploadId, cleanedParts]
//             }
//         ]);

//         await this.#persistChunkStatus({
//             uploadId,
//             objectName,
//             partNumber: 0,
//             status: 'completed',
//             chunkId: null,
//             etag: null,
//             hash: null,
//             size: null,
//             method,
//             userId
//         });

//         return { success: true, objectName };
//     }

//     async abortMultipartUpload({ uploadId, objectName }) {
//         await this.#callFirstAvailableMethod([
//             {
//                 name: 'abortMultipartUpload',
//                 args: [this.bucketName, objectName, uploadId]
//             },
//             {
//                 name: 'abortMultipart',
//                 args: [this.bucketName, objectName, uploadId]
//             }
//         ]);

//         await this.#persistChunkStatus({
//             uploadId,
//             objectName,
//             partNumber: 0,
//             status: 'aborted',
//             chunkId: null,
//             etag: null,
//             hash: null,
//             size: null
//         });

//         return { success: true };
//     }

//     async #getUploadedPart(uploadId, objectName, partNumber) {
//         const parts = await this.#listUploadedParts(uploadId, objectName);
//         const part = parts.find((candidate) => Number(candidate.part || candidate.partNumber) === partNumber);
//         return {
//             found: Boolean(part),
//             part: part || null
//         };
//     }

//     async #listUploadedParts(uploadId, objectName) {
//         try {
//             const result = await this.#callFirstAvailableMethod([
//                 {
//                     name: 'listParts',
//                     args: [this.bucketName, objectName, uploadId]
//                 },
//                 {
//                     name: 'listObjectParts',
//                     args: [this.bucketName, objectName, uploadId]
//                 }
//             ]);

//             if (Array.isArray(result)) {
//                 return result;
//             }

//             if (result && Array.isArray(result.parts)) {
//                 return result.parts;
//             }

//             return [];
//         } catch {
//             return [];
//         }
//     }

//     async #persistChunkStatus(payload) {
//         if (!this.db) {
//             return { persisted: false };
//         }

//         if (typeof this.db.markChunkStatus === 'function') {
//             await this.db.markChunkStatus(payload);
//             return { persisted: true };
//         }

//         if (typeof this.db.upsertChunkStatus === 'function') {
//             await this.db.upsertChunkStatus(payload);
//             return { persisted: true };
//         }

//         throw new Error('db must expose markChunkStatus or upsertChunkStatus');
//     }

//     async #callFirstAvailableMethod(candidates) {
//         for (let i = 0; i < candidates.length; i++) {
//             const candidate = candidates[i];
//             if (typeof this.mini[candidate.name] === 'function') {
//                 return this.mini[candidate.name](...candidate.args);
//             }
//         }

//         const names = candidates.map((candidate) => candidate.name).join(', ');
//         throw new Error(`MinIO SDK missing required method. Tried: ${names}`);
//     }

//     #buildObjectName(userId, fileName) {
//         const safeFileName = String(fileName || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
//         const prefix = userId ? `users/${userId}` : 'users/unknown';
//         return `${prefix}/${Date.now()}-${safeFileName}`;
//     }

//     #normalizeEtag(etag) {
//         return String(etag || '').replace(/\"/g, '');
//     }
// }

// export { uploady };