import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import type { Readable } from "node:stream";
import type { PutFileRequest } from ".";
import { config } from "../config";
import { createLogger } from "../log";

const Log = createLogger("s3");

const client = config.storage.s3.enabled
	? new S3Client({
			region: config.storage.s3.region,
			endpoint: config.storage.s3.endpoint,
			credentials: {
				accessKeyId: config.storage.s3.accessKey,
				secretAccessKey: config.storage.s3.secret,
			},
			forcePathStyle: config.storage.s3.forcePathStyle,
		})
	: null;

const createEndpoint = async (file: PutFileRequest) => {
	if (!client) throw new Error("s3 not enabled");

	// TODO: shouldn't we just use the hash provided by the client?
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

const checkFileExists = async (channel_id: string, hash: string) => {
	if (!client) throw new Error("s3 not enabled");

	const command = new HeadObjectCommand({
		Bucket: config.storage.s3.bucket,
		Key: `${channel_id}/${hash}`,
	});

	try {
		const ret = await client.send(command);
		return {
			type: ret.ContentType,
			length: ret.ContentLength,
			width: ret.Metadata?.width
				? Number.parseInt(ret.Metadata.width)
				: undefined,
			height: ret.Metadata?.height
				? Number.parseInt(ret.Metadata.height)
				: undefined,
		};
	} catch (e) {
		Log.error(e);
		return false;
	}
};

const getFileStream = async (channel_id: string, hash: string) => {
	if (!client) throw new Error("s3 not enabled");

	const command = new GetObjectCommand({
		Bucket: config.storage.s3.bucket,
		Key: `${channel_id}/${hash}`,
	});

	const res = await client.send(command);

	if (!res || !res.Body) return false;

	return res.Body as Readable;
};

const deleteFile = async (channel_id: string, hash: string) => {
	if (!client) throw new Error("s3 not enabled");

	const command = new DeleteObjectCommand({
		Bucket: config.storage.s3.bucket,
		Key: `${channel_id}/${hash}`,
	});

	await client.send(command);
};

const s3 = { createEndpoint, getFileStream, checkFileExists, deleteFile };

export default s3;
