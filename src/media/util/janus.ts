import { config } from "../../util/config";
import { Janus } from "../janus";

let janus: Janus;

export const initJanus = () => {
	janus = new Janus();
	return janus.connect({ address: { url: config.webrtc.janus_url } });
};

export const getJanus = () => {
	if (!janus) throw new Error("Janus not initialised yet");
	return janus;
};
