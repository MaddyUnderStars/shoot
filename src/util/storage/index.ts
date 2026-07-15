import { config } from "../config.js";
import local from "./local.js";
import s3 from "./s3.js";
import { BaseModel } from "../../entity/basemodel.js";

const api = config().storage.s3.enabled ? s3 : local;

export type PutFileRequest = {
	target: BaseModel;

	name: string;
	size: number;
	mime: string;
	md5: string;
	width?: number;
	height?: number;
};

export const createUploadEndpoint = (file: PutFileRequest) => api.createEndpoint(file);

export const checkFileExists = (target: BaseModel, hash: string) =>
	api.checkFileExists(target, hash);

export const getFileStream = (target: BaseModel, hash: string) => api.getFileStream(target, hash);

export const deleteFile = (target: BaseModel, hash: string) => api.deleteFile(target, hash);
