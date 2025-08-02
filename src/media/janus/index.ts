import EventEmitter from "node:events";
import WebSocket, { type RawData } from "ws";
import { createLogger } from "../../util/log";
import type {
	JANUS_REQUEST,
	JANUS_RESPONSE,
	JANUS_RESPONSE_DATA,
	RESPONSE_ATTACH_HANDLE,
	RESPONSE_CONFIGURE,
	RESPONSE_CREATE_ROOM,
	RESPONSE_CREATE_SESSION,
	RESPONSE_JOIN_ROOM,
	RESPONSE_LEAVE_ROOM,
} from "./types";

const HEARTBEAT_INTERVAL = 10 * 1000;

const Log = createLogger("JANUS");

type JanusConfiguration = {
	address: {
		url: string;
		token?: string;
	};
};

export class Janus extends EventEmitter {
	private socket: WebSocket;
	private heartbeatInterval: NodeJS.Timeout;
	private token?: string;
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: incorrect lint
	private sequence = 0;
	private adminSession: number;
	private adminHandle: number;

	get session() {
		return this.adminSession;
	}

	public connect = (config: JanusConfiguration): Promise<void> => {
		this.token = config.address.token;

		this.socket = new WebSocket(
			new URL(config.address.url),
			"janus-protocol",
		);

		this.socket.on("close", this.onClose);
		this.socket.on("error", this.onError);

		return new Promise((resolve, reject) => {
			const open = () => {
				this.onOpen();
				this.socket.removeListener("error", error);
				resolve();
			};

			const error = (err: Error) => {
				this.onError(err);
				this.socket.removeListener("open", open);
				reject(err);
			};

			this.socket.once("open", open);
			this.socket.once("error", error);
		});
	};

	private onOpen = async () => {
		Log.msg("Connected");
		this.startHeartbeat();

		this.adminSession = (await this.createSession()).id;
		this.adminHandle = (await this.attachHandle()).id;
	};

	public createSession = () =>
		this.send<RESPONSE_CREATE_SESSION>({ janus: "create" });

	public attachHandle = () =>
		this.send<RESPONSE_ATTACH_HANDLE>({
			janus: "attach",
			session_id: this.session,
			plugin: "janus.plugin.audiobridge",
		});

	public createRoom = () =>
		this.send<RESPONSE_CREATE_ROOM>({
			janus: "message",
			body: {
				request: "create",
				audiolevel_event: true,
			},
			session_id: this.session,
			handle_id: this.adminHandle,
		});

	public joinRoom = (handle_id: number, room_id: number, display: string) =>
		this.send<RESPONSE_JOIN_ROOM>({
			janus: "message",
			body: {
				request: "join",
				display,
				room: room_id,
			},
			session_id: this.session,
			handle_id,
		});

	public leaveRoom = (handle_id: number) =>
		this.send<RESPONSE_LEAVE_ROOM>({
			janus: "message",
			body: {
				request: "leave",
			},
			session_id: this.session,
			handle_id,
		});

	public configure = (
		handle_id: number,
		jsep?: { type: string; sdp: string },
	) =>
		this.send<RESPONSE_CONFIGURE>({
			janus: "message",
			body: {
				request: "configure",
			},
			jsep,
			session_id: this.session,
			handle_id,
		});

	public trickle = (handle_id: number, candidates: RTCIceCandidateInit[]) =>
		this.send({
			janus: "trickle",
			session_id: this.session,
			handle_id,
			candidates: [...candidates, null],
		});

	private onClose = (code: number, reason: string) => {
		Log.msg(`Closed with code ${code} : ${reason}`);
		clearTimeout(this.heartbeatInterval);
	};

	private onError = (_e: Error) => {
		// TODO
	};

	// TODO: reject on timeout?
	// TODO: rewrite
	private send = <
		O extends JANUS_RESPONSE_DATA,
		I extends JANUS_REQUEST = JANUS_REQUEST,
	>(
		payload: I,
	): Promise<O> =>
		new Promise((resolve) => {
			const transaction = `${this.sequence++}`;
			const decorated = { ...payload, token: this.token, transaction };

			const listener = (data: RawData) => {
				// TODO: is `listener` unique for each call to send?
				const json = JSON.parse(data.toString()) as JANUS_RESPONSE<O>;

				if (json.transaction !== transaction) return;

				if ("plugindata" in json && json.plugindata) {
					json.data = json.plugindata;
					if ("data" in json.data)
						json.data = json.data.data as unknown as O;
					json.plugindata = undefined;
				}

				if (
					"data" in json &&
					"audiobridge" in json.data &&
					json.data.audiobridge === "event" &&
					json.jsep
				) {
					json.data.jsep = json.jsep;
				}

				if ("data" in json) {
					this.socket.removeListener("message", listener);
					this.socket.setMaxListeners(
						this.socket.getMaxListeners() - 1,
					);
					return resolve(json.data);
				}

				if (
					payload.janus === "trickle" ||
					(payload.janus === "message" &&
						payload.body.request !== "configure")
				) {
					this.socket.removeListener("message", listener);
					this.socket.setMaxListeners(
						this.socket.getMaxListeners() - 1,
					);
					resolve({} as O);
				}
			};

			this.socket.setMaxListeners(this.socket.getMaxListeners() + 1);
			this.socket.on("message", listener);

			this.socket.send(JSON.stringify(decorated));
		});

	private startHeartbeat = () => {
		this.heartbeatInterval = setInterval(
			() =>
				this.send({
					janus: "keepalive",
					session_id: this.session,
				}),
			HEARTBEAT_INTERVAL,
		); // 10 seconds
	};
}
