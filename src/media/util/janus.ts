import { config } from "../../util/config.js";
import { Janus } from "../janus/index.js";

let janus: Janus;

export const initJanus = () => {
	janus = new Janus();
	return janus.connect({ address: { url: config().webrtc.janus_url } });
};

export const getJanus = () => {
	if (!janus) throw new Error("Janus not initialised yet");
	return janus;
};
