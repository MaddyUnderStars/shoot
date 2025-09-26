import EventEmitter from "node:events";
import * as rabbit from "rabbitmq-stream-js-client";
import { getMetadataArgsStorage } from "typeorm";
import type { BaseModel } from "../entity/basemodel";
import { Channel } from "../entity/channel";
import type { GATEWAY_EVENT } from "../gateway/util/validation/send";
import { config } from "./config";
import { createLogger } from "./log";

const Log = createLogger("events");

const events = new EventEmitter();

// TODO: move rabbitmq handlers to own files

let startedRabbitmq = false;
let client: rabbit.Client | null = null;
let publisher: rabbit.Publisher | null = null;

export const initRabbitMQ = async (consume: boolean) => {
	if (startedRabbitmq) return;
	if (!config.rabbitmq.enabled) return;
	startedRabbitmq = true;

	const url = config.rabbitmq.url;

	const STREAM_NAME = "gateway";

	Log.msg(`Connecting to ${url}`);

	client = await rabbit.connect({
		hostname: url.hostname,
		port: Number.parseInt(url.port, 10),
		username: url.username,
		password: url.password,
		vhost: url.pathname,
		heartbeat: 0,
	});

	Log.msg("Connected to RabbitMQ");

	await client.createStream({
		stream: STREAM_NAME,
		arguments: {
			"max-age": "1h",
		},
	});

	Log.verbose(`Created stream ${STREAM_NAME}`);

	publisher = await client.declarePublisher({
		stream: STREAM_NAME,
		publisherRef: "gateway",
	});

	Log.verbose("Created publisher");

	if (consume) {
		await client.declareConsumer(
			{ stream: STREAM_NAME, offset: rabbit.Offset.next() },
			(message) => {
				const parsed = JSON.parse(message.content.toString());

				const target = message.messageProperties?.to;
				if (!target) {
					Log.warn("Received rabbitmq message without `to` field");
					return;
				}

				events.emit(target, parsed);
			},
		);

		Log.verbose("Created consumer");
	}
};

export const closeRabbitMQ = async () => {
	await client?.close();
};

export const emitGatewayEvent = (
	targets: BaseModel | BaseModel[],
	payload: GATEWAY_EVENT,
) => {
	if (!Array.isArray(targets)) targets = [targets];

	const targetIds = targets.map(makeGatewayTarget);

	if (publisher) {
		// rabbitmq emit
		for (const target of targetIds) {
			publisher
				.send(Buffer.from(JSON.stringify(payload)), {
					messageProperties: { to: target },
				})
				.catch(() => {
					Log.error("Failed to emit rabbitmq event?");
				});
		}
	} else {
		// normal event emit
		for (const target of targetIds) {
			events.emit(target, payload);
		}
	}
};

export const makeGatewayTarget = (target: BaseModel) => {
	let constr = target.constructor;
	if (target instanceof Channel) {
		constr = Channel;
	}

	const name = getMetadataArgsStorage().tables.find(
		(x) => x.target === constr,
	)?.name;

	if (!name) {
		throw new Error("Failed to find database table for that target");
	}

	return `${name}:${target.id}`;
};

export const listenGatewayEvent = (
	target: BaseModel,
	callback: (payload: GATEWAY_EVENT) => unknown,
) => {
	const id = makeGatewayTarget(target);

	events.setMaxListeners(events.getMaxListeners() + 1);
	events.addListener(id, callback);

	return () => {
		events.removeListener(id, callback);
		events.setMaxListeners(events.getMaxListeners() - 1);
	};
};
