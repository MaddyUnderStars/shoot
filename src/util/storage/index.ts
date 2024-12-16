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
		})
	: null;

export const createUploadEndpoint = (
	channel_id: string,
	filename: string,
	filesize: number,
) => {
	if (config.storage.s3.enabled) {
		return createS3Endpoint(channel_id, filename, filesize);
	}

	throw new Error("unimplemented");
};

const createS3Endpoint = async (
	channel_id: string,
	filename: string,
	filesize: number,
) => {
	if (!client) throw new Error("s3 not enabled");

	const hash = crypto
		.createHash("md5")
		.update(filename)
		.update(Date.now().toString())
		.digest("hex");

	const command = new PutObjectCommand({
		Bucket: config.storage.s3.bucket,
		Key: `${channel_id}/${hash}`,
		ContentLength: filesize,
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
		const res = await client.send(command);
		return true;
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
