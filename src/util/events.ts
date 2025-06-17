import EventEmitter from "node:events";
import type { GATEWAY_EVENT } from "../gateway/util/validation";
import { config } from "./config";

import * as rabbit from "rabbitmq-stream-js-client";
import { createLogger } from "./log";

const Log = createLogger("events");

const events = new EventEmitter();

let client: rabbit.Client | null = null;
let publisher: rabbit.Publisher | null = null;

export const initRabbitMQ = async () => {
	const url = config.rabbitmq.url;

	const STREAM_NAME = "gateway";

	client = await rabbit.connect({
		hostname: url.hostname,
		port: Number.parseInt(url.port),
		username: url.username,
		password: url.password,
		vhost: url.pathname,
		heartbeat: 0,
	});

	await client.createStream({
		stream: STREAM_NAME,
		arguments: {
			"max-age": "1h",
		},
	});

	publisher = await client.declarePublisher({
		stream: STREAM_NAME,
		publisherRef: "gateway",
	});

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
};

export const closeRabbitMQ = async () => {
	await client?.close();
};

export const emitGatewayEvent = (
	targets: string | string[],
	payload: GATEWAY_EVENT,
) => {
	if (!Array.isArray(targets)) targets = [targets];

	if (publisher) {
		// rabbitmq emit
		for (const target of targets) {
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
		for (const target of targets) {
			events.emit(target, payload);
		}
	}
};

export const listenGatewayEvent = (
	target: string,
	callback: (payload: GATEWAY_EVENT) => unknown,
) => {
	events.setMaxListeners(events.getMaxListeners() + 1);
	events.addListener(target, callback);

	return () => {
		events.removeListener(target, callback);
		events.setMaxListeners(events.getMaxListeners() - 1);
	};
};

const internal = {
	emitGatewayEvent,
	listenGatewayEvent,
};

export { internal };
