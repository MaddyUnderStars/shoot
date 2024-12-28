import { config } from "../config";

import local from "./local";
import s3 from "./s3";

const api = config.storage.s3.enabled ? s3 : local;

export type PutFileRequest = {
	channel_id: string;
	name: string;
	size: number;
	mime: string;
	md5: string;
	width?: number;
	height?: number;
};

export const createUploadEndpoint = (file: PutFileRequest) =>
	api.createEndpoint(file);

export const checkFileExists = (channel_id: string, hash: string) =>
	api.checkFileExists(channel_id, hash);

export const getFileStream = (channel_id: string, hash: string) =>
	api.getFileStream(channel_id, hash);

export const deleteFile = (channel_id: string, hash: string) =>
	api.deleteFile(channel_id, hash);
