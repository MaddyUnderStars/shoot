import EventEmitter from "events";
import { Connection, Janode } from "janode";
import { config, createLogger } from "../../util";

const Log = createLogger("media");

type jcon = Connection & EventEmitter;

let connection: jcon;

export const initJanus = async () => {
	connection = await Janode.connect({
		address: {
			url: config.webrtc.janus_url,
			apisecret: config.webrtc.janus_secret,
		},
	});

	connection.once(Janode.EVENT.CONNECTION_CLOSED, () => {
		Log.error(`Janus closed, TOOD: retry`);
	});
};

export const getJanus = () => {
	if (!connection) throw new Error("Janus not initialised");

	return connection;
};
