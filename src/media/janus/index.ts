import WebSocket, { type ErrorEvent, type MessageEvent } from "ws";
import { createLogger } from "../../util";

const HEARTBEAT_INTERVAL = 10 * 1000;

const Log = createLogger("JANUS");

export class Janus {
	private socket: WebSocket;
	private heartbeatInterval: NodeJS.Timeout;
	private token?: string;

	connect = (config: JanusConfiguration) => {
		this.token = config.address.token;

		this.socket = new WebSocket(
			new URL(config.address.url),
			"janus-protocol",
		);

		this.socket.addEventListener("open", this.onOpen, { once: true });
		this.socket.addEventListener("message", this.onMessage);
		this.socket.addEventListener("close", this.onClose);
		this.socket.addEventListener("error", this.onError);
	};

	private onOpen = () => {
		Log.msg("Connected");
		this.startHeartbeat();

		// Make a session
		this.send({ janus: "create" });
	};

	private onMessage = (data: MessageEvent) => {
		const json = JSON.parse(data.data.toString());

		console.log(json);
	};

	private onClose = () => {
		clearTimeout(this.heartbeatInterval);
	};

	private onError = (e: ErrorEvent) => {
		Log.error(e);
	};

	private send = async (payload: JanusRequest) => {
		const decorated = { ...payload, token: this.token };

		this.socket.send(JSON.stringify(decorated));
	};

	private startHeartbeat = () => {
		this.heartbeatInterval = setInterval(() => {
			let _timeout: NodeJS.Timeout;

			const timeout = new Promise((_, reject) => {
				_timeout = setTimeout(
					() => reject("timed out"),
					HEARTBEAT_INTERVAL + 1000,
				);
			}); // 1 second grace

			const ping = new Promise<void>((resolve, reject) => {
				this.socket.ping(`${Date.now()}`, undefined, (error) => {
					clearTimeout(_timeout);
					reject(error);
				});

				this.socket.once("pong", () => {
					clearTimeout(_timeout);
					resolve();
				});
			});

			return Promise.race([timeout, ping]);
		}, HEARTBEAT_INTERVAL); // 10 seconds
	};
}

type JanusConfiguration = {
	address: {
		url: string;
		token?: string;
	};
};

type JANUS_CREATE = {
	janus: "create";
};

type JanusRequest = JANUS_CREATE;
