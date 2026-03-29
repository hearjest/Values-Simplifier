import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class S3Uploader {
	constructor(db, opts = {}) {
		this.s3 = new S3Client({
			region: process.env.AWS_REGION,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});
		this.db = db || null;
		this.bucketName = opts.bucketName || process.env.S3_BUCKET_NAME;
		this.partSize = opts.partSize || (5 * 1024 * 1024);
		this.urlExpirySeconds = opts.urlExpirySeconds || (15 * 60);
	}

	async initMultipartUpload({ userId, fileName, fileSize, contentType, method }) {
		const objectName = this.#buildObjectName(userId, fileName);
		const command = new CreateMultipartUploadCommand({
			Bucket: this.bucketName,
			Key: objectName,
			ContentType: contentType || 'application/octet-stream',
		});
		const response = await this.s3.send(command);
		const uploadId = response.UploadId;
		const totalParts = Math.ceil(Number(fileSize) / this.partSize);
		await this.#persistChunkStatus({
			uploadId,
			objectName,
			partNumber: 0,
			status: 'initiated',
			chunkId: null,
			etag: null,
			hash: null,
			size: Number(fileSize) || 0,
			method
		});
		return {
			bucketName: this.bucketName,
			objectName,
			uploadId,
			partSize: this.partSize,
			totalParts
		};
	}

	async signPartUpload({ uploadId, objectName, partNumber }) {
		const command = new UploadPartCommand({
			Bucket: this.bucketName,
			Key: objectName,
			UploadId: uploadId,
			PartNumber: partNumber,
		});
		const url = await getSignedUrl(this.s3, command, { expiresIn: this.urlExpirySeconds });
		return {
			url,
			partNumber,
			expiresIn: this.urlExpirySeconds
		};
	}

	async completeMultipartUpload({ uploadId, objectName, parts, method, userId }) {
		const cleanedParts = (parts || [])
			.map((part) => ({
				ETag: part.etag,
				PartNumber: Number(part.part)
			}))
			.sort((a, b) => a.PartNumber - b.PartNumber);
		const command = new CompleteMultipartUploadCommand({
			Bucket: this.bucketName,
			Key: objectName,
			UploadId: uploadId,
			MultipartUpload: { Parts: cleanedParts }
		});
		await this.s3.send(command);
		await this.#persistChunkStatus({
			uploadId,
			objectName,
			partNumber: 0,
			status: 'completed',
			chunkId: null,
			etag: null,
			hash: null,
			size: null,
			method,
			userId
		});
		return { success: true, objectName };
	}

	async abortMultipartUpload({ uploadId, objectName }) {
		const command = new AbortMultipartUploadCommand({
			Bucket: this.bucketName,
			Key: objectName,
			UploadId: uploadId
		});
		await this.s3.send(command);
		await this.#persistChunkStatus({
			uploadId,
			objectName,
			partNumber: 0,
			status: 'aborted',
			chunkId: null,
			etag: null,
			hash: null,
			size: null
		});
		return { success: true };
	}

	async #persistChunkStatus(payload) {
		if (!this.db) {
			return { persisted: false };
		}
		if (typeof this.db.markChunkStatus === 'function') {
			await this.db.markChunkStatus(payload);
			return { persisted: true };
		}
		if (typeof this.db.upsertChunkStatus === 'function') {
			await this.db.upsertChunkStatus(payload);
			return { persisted: true };
		}
		throw new Error('db must expose markChunkStatus or upsertChunkStatus');
	}

	#buildObjectName(userId, fileName) {
		const safeFileName = String(fileName || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
		const prefix = userId ? `users/${userId}` : 'users/unknown';
		return `${prefix}/${Date.now()}-${safeFileName}`;
	}
	
	async putObject({ userId, fileName, fileBuffer, contentType }) {
		const objectName = this.#buildObjectName(userId, fileName);
		const params = {
			Bucket: this.bucketName,
			Key: objectName,
			Body: fileBuffer,
			ContentType: contentType || 'application/octet-stream',
		};
		try {
			const { PutObjectCommand } = await import('@aws-sdk/client-s3');
			await this.s3.send(new PutObjectCommand(params));
			return { success: true, objectName };
		} catch (err) {
			return { success: false, error: err };
		}
	}
}

export { S3Uploader };