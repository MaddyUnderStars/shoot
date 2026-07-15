import { getMetadataArgsStorage } from "typeorm";
import { BaseModel } from "../../entity/basemodel.js";
import { Channel } from "../../entity/channel.js";

export const getTableName = (target: BaseModel) => {
	let constr = target.constructor;
	if (target instanceof Channel) {
		constr = Channel;
	}

	const name = getMetadataArgsStorage().tables.find((x) => x.target === constr)?.name;

	if (!name) {
		throw new Error("Failed to find database table for that target");
	}

	return name;
};
