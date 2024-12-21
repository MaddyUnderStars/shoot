import {
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import type { Readable } from "node:stream";
import { config } from "../config";
import { createLogger } from "../log";

const Log = createLogger("storage");

const client = config.storage.s3.enabled
	? new S3Client({
			region: config.storage.s3.region,
			endpoint: config.storage.s3.endpoint,
			credentials: {
				accessKeyId: config.storage.s3.accessKey,
				secretAccessKey: config.storage.s3.secret,
			},
			forcePathStyle: true, // TODO add this to config file
		})
	: null;

export type PutFileRequest = {
	channel_id: string;
	name: string;
	size: number;
	mime: string;
	md5: string;
	width?: number;
	height?: number;
};

export const createUploadEndpoint = (file: PutFileRequest) => {
	if (config.storage.s3.enabled) {
		return createS3Endpoint(file);
	}

	throw new Error("unimplemented");
};

const createS3Endpoint = async (file: PutFileRequest) => {
	if (!client) throw new Error("s3 not enabled");

	const hash = crypto
		.createHash("md5")
		.update(file.name)
		.update(file.mime)
		.update(Date.now().toString())
		.digest("hex");

	const command = new PutObjectCommand({
		Bucket: config.storage.s3.bucket,
		Key: `${file.channel_id}/${hash}`,
		ContentLength: file.size,
		ContentType: file.mime,
		ContentMD5: file.md5,
		Metadata:
			file.width && file.height
				? {
						width: file.width.toString(),
						height: file.height.toString(),
					}
				: undefined,
	});

	return {
		endpoint: await getSignedUrl(client, command, { expiresIn: 300 }),
		hash,
	};
};

export const checkFileExists = async (channel_id: string, hash: string) => {
	if (!client) throw new Error("s3 not enabled");

	const command = new HeadObjectCommand({
		Bucket: config.storage.s3.bucket,
		Key: `${channel_id}/${hash}`,
	});

	try {
		return await client.send(command);
	} catch (e) {
		Log.error(e);
		return false;
	}
};

export const getFileStream = async (channel_id: string, hash: string) => {
	if (!client) throw new Error("s3 not enabled");

	const command = new GetObjectCommand({
		Bucket: config.storage.s3.bucket,
		Key: `${channel_id}/${hash}`,
	});

	const res = await client.send(command);

	if (!res || !res.Body) return false;

	return res.Body as Readable;
};
