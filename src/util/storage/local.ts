import filetype from "file-type";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { Stats } from "node:fs";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { PutFileRequest } from ".";
import { config } from "../config";
import { createLogger } from "../log";

const Log = createLogger("localstorage");

export type localFileJwt = PutFileRequest & { key: string };

const createEndpoint = async (file: PutFileRequest) => {
	// TODO: if federation is disabled, this defaults to localhost
	// which is obviously wrong
	const endpoint = `${config.federation.instance_url.origin}/upload`;

	const hash = crypto
		.createHash("md5")
		.update(file.name)
		.update(file.mime)
		.update(Date.now().toString())
		.digest("hex");

	const token = await new Promise<string>((resolve, reject) => {
		jwt.sign(
			{
				...file,
				key: `${file.channel_id}/${hash}`,
			} as localFileJwt,
			config.security.jwt_secret,
			{ expiresIn: 300 },
			(err, encoded) => {
				if (err || !encoded) return reject(err);
				return resolve(encoded);
			},
		);
	});

	return {
		endpoint: `${endpoint}?t=${token}`,
		hash,
	};
};

const checkFileExists = async (channel_id: string, hash: string) => {
	const p = path.join(config.storage.directory, channel_id, hash);
	let file: Stats;
	try {
		file = await fs.stat(p);
	} catch (e) {
		return false;
	}

	return {
		length: file.size,
		type: (await filetype.fromFile(p))?.mime,

		/**
		 * TODO: we need to store or fetch this metadata from somewhere
		 * I've thought of:
		 * - storing it in exif (can't find a good reader/writer on npm)
		 * - storing it in db as an Attachment (have to rearrange the existing logic)
		 * - just using mmmagic and ffmpeg directly to find it on the fly (bad option, slow)
		 */
		width: undefined,
		height: undefined,
	};
};

const getFileStream = async (channel_id: string, hash: string) => {
	const p = path.join(config.storage.directory, channel_id, hash);
	try {
		return Readable.from(createReadStream(p));
	} catch (e) {
		return false;
	}
};

const deleteFile = async (channel_id: string, hash: string) => {
	const p = path.join(config.storage.directory, channel_id, hash);
	await fs.rm(p);
};

const api = { createEndpoint, checkFileExists, getFileStream, deleteFile };

export default api;
