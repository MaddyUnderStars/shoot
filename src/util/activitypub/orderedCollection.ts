import type { ObjectType, SelectQueryBuilder } from "typeorm";
import type { BaseModel } from "../../entity/basemodel.js";
import { addContext } from "./util.js";
import { buildPaginator } from "../cursor-pagination/buildPaginator.js";
import { AnyAPObject } from "@shootpub/activitypub-types/object";
import { APCollection } from "@shootpub/activitypub-types/collection";

type Props<T extends BaseModel> = {
	entity: ObjectType<T>;
	qb: SelectQueryBuilder<T>;
	keys?: Extract<keyof T, string>[];
	id: string;
	convert: (data: T) => string | AnyAPObject;
	before?: string;
	after?: string;
};

export const orderedCollectionHandler = async <T extends BaseModel>(
	props: Props<T>,
): Promise<APCollection> => {
	const { qb, entity, id, convert } = props;

	const paginator = buildPaginator({
		entity,

		paginationKeys: props.keys ? props.keys : (["id"] as Extract<BaseModel, string>),
		query: {
			limit: 50,
			order: "ASC",
			afterCursor: "after" in props ? props.after : undefined,
			beforeCursor: "before" in props ? props.before : undefined,
		},
	});

	const { data, cursor } = await paginator.paginate(qb);

	let next: URL | undefined;
	if (cursor.afterCursor) {
		next = new URL(id);
		next.searchParams.set("after", cursor.afterCursor);
		next.searchParams.delete("before");
	}

	let prev: URL | undefined;
	if (cursor.beforeCursor) {
		prev = new URL(id);
		prev.searchParams.set("before", cursor.beforeCursor);
		prev.searchParams.delete("after");
	}

	return addContext({
		id,

		type: "OrderedCollection",
		next: next ? next.toString() : undefined,
		prev: prev ? prev.toString() : undefined,

		totalItems: await qb.getCount(),
		items: data.map(convert),
	});
};
