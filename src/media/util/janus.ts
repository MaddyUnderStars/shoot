import {
	AudioBridgePlugin,
	Janode,
	type Connection,
	type Session,
} from "janode";
import type EventEmitter from "node:events";
import { config, createLogger } from "../../util";

const Log = createLogger("media");

type jcon = Connection & EventEmitter;

let connection: jcon;
let session: Session;
// biome-ignore lint/suspicious/noExplicitAny: TODO
let adminHandle: any;

export const initJanus = async () => {
	connection = await Janode.connect({
		address: {
			url: config.webrtc.janus_url,
			apisecret: config.webrtc.janus_secret,
		},
	});

	connection.once(Janode.EVENT.CONNECTION_CLOSED, () => {
		Log.error("Janus closed, TOOD: retry");
	});

	session = await connection.create();

	adminHandle = await session.attach(AudioBridgePlugin);
};

export const getJanusConnection = () => {
	if (!connection) throw new Error("Janus not initialised");

	return connection;
};

export const getJanusSession = () => {
	return session;
};

export const getJanusHandle = () => {
	return adminHandle;
};
