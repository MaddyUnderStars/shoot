import crypto from "node:crypto";
import type { Stats } from "node:fs";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import jwt from "jsonwebtoken";
import { LocalUpload } from "../../entity/upload";
import { config } from "../config";
import { makeInstanceUrl } from "../url";
import type { PutFileRequest } from ".";

export type localFileJwt = PutFileRequest & { key: string };

const createEndpoint = async (file: PutFileRequest) => {
	// TODO: if federation is disabled, this defaults to localhost
	// which is obviously wrong

	const endpoint = makeInstanceUrl("/upload");

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
	} catch (_) {
		return false;
	}

	const upload = await LocalUpload.findOne({
		where: {
			hash: hash,
			channel: { id: channel_id },
		},
	});

	if (!upload) {
		// TODO: do some cleanup?
		// or perhaps, we can just package a cleanup script
		return false;
	}

	return {
		length: file.size,
		type: upload.mime,
		width: upload.width,
		height: upload.height,
	};
};

const getFileStream = async (channel_id: string, hash: string) => {
	const p = path.join(config.storage.directory, channel_id, hash);
	try {
		return Readable.from(createReadStream(p));
	} catch (_) {
		return false;
	}
};

const deleteFile = async (channel_id: string, hash: string) => {
	const p = path.join(config.storage.directory, channel_id, hash);
	await fs.rm(p);
};

const api = { createEndpoint, checkFileExists, getFileStream, deleteFile };

export default api;
