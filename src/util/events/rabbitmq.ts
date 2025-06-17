import type { GATEWAY_EVENT } from "../../gateway/util/validation";
import * as rabbit from "rabbitmq-stream-js-client";
import { config } from "../config";
import { createLogger } from "../log";

const Log = createLogger("rabbitmq");

let client: rabbit.Client;
let publisher: rabbit.Publisher;

const STREAM_NAME = "gateway";

const initEvents = async () => {
	const url = config.rabbitmq.url;

	client = await rabbit.connect({
		hostname: url.hostname,
		port: Number.parseInt(url.port),
		username: url.username,
		password: url.password,
		vhost: url.pathname,
	});

	await client.createStream({
		stream: STREAM_NAME,
		arguments: {
			"max-age": "1h", // 1 hour retention. TODO: configure?
		},
	});

	publisher = await client.declarePublisher({ stream: STREAM_NAME });
};

const emitGatewayEvent = async (
	targets: string | string[],
	payload: GATEWAY_EVENT,
) => {
	if (!Array.isArray(targets)) targets = [targets];

	for (const target of targets) {
		await publisher.send(Buffer.from(JSON.stringify(payload)), {
			messageProperties: {
				to: target,
			},
		});
	}
};

const listenGatewayEvent = async (
	target: string,
	callback: (payload: GATEWAY_EVENT) => unknown,
) => {
	const consumer = await client.declareConsumer(
		{
			stream: STREAM_NAME,
			filter: {
				values: [target],
				postFilterFunc: (msg) => msg.messageProperties?.to === target,
				matchUnfiltered: true,
			},
			offset: rabbit.Offset.last(),
		},
		async (message) => {
			const parsed = JSON.parse(message.content.toString());

			callback(parsed);
		},
	);

	return () => {
		consumer.close(true).catch(() => {
			Log.error("Failed to close consumer?");
		});
	};
};

const rabbitmq = {
	initEvents,
	emitGatewayEvent,
	listenGatewayEvent,
};

export { rabbitmq };
