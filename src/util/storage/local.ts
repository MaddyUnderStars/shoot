import crypto from "node:crypto";
import type { Stats } from "node:fs";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import jwt from "jsonwebtoken";
import { LocalUpload } from "../../entity/upload.js";
import { config } from "../config.js";
import { makeInstanceUrl } from "../url.js";
import type { PutFileRequest } from "./index.js";
import { getTableName } from "../entity/util.js";
import { BaseModel } from "../../entity/basemodel.js";
import { FindOptionsWhere } from "typeorm";
import { DMChannel } from "../../entity/DMChannel.js";
import { GuildTextChannel } from "../../entity/textChannel.js";
import { Channel } from "../../entity/channel.js";
import { User } from "../../entity/user.js";

export type localFileJwt = Omit<PutFileRequest, "target"> & {
	key: string;
	target_id: string;
	target_name: string;
};

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
				target: undefined,
				target_id: file.target.id,
				target_name: getTableName(file.target),
				key: `${getTableName(file.target)}/${file.target.id}/${hash}`,
			} as localFileJwt,
			config().security.jwt_secret,
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

const checkFileExists = async (target: BaseModel, hash: string) => {
	const p = path.join(config().storage.directory, getTableName(target), target.id, hash);
	let file: Stats;
	try {
		file = await fs.stat(p);
	} catch {
		return false;
	}

	const where: FindOptionsWhere<LocalUpload> = {
		hash: hash,
	};

	switch (true) {
		case target instanceof DMChannel:
		case target instanceof GuildTextChannel:
		case target instanceof Channel: {
			where.channel = { id: target.id };
			break;
		}
		case target instanceof User:
			where.user = { id: target.id };
			break;
	}

	const upload = await LocalUpload.findOne({
		where,
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

const getFileStream = async (target: BaseModel, hash: string) => {
	const storageDir = path.resolve(config().storage.directory);

	const rawPath = path.join(storageDir, getTableName(target), target.id, hash);

	const normalised = path.normalize(rawPath);

	// path traversal was attempted
	if (!normalised.startsWith(storageDir)) return false;

	try {
		return Readable.from(createReadStream(normalised));
	} catch {
		return false;
	}
};

const deleteFile = async (target: BaseModel, hash: string) => {
	const p = path.join(config().storage.directory, getTableName(target), target.id, hash);
	await fs.rm(p);
};

const api = { createEndpoint, checkFileExists, getFileStream, deleteFile };

export default api;
