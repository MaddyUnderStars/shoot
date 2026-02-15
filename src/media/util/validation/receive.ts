import { z } from "zod";

export const RTCIceCandidate = z.object({
	candidate: z.string(),
	sdpMLineIndex: z.number().nullable(),
	sdpMid: z.string().nullable(),
	usernameFragment: z.string().nullable(),
});

export type RTCIceCandidate = z.infer<typeof RTCIceCandidate>;

export const IDENTIFY = z.object({
	/** User token to use to login */
	token: z.string(),

	/** webrtc offer */
	offer: z.object({
		type: z.string(),
		sdp: z.string(),
	}),

	candidates: RTCIceCandidate.array(),
});

export const HEARTBEAT = z.object({
	s: z.number(),
});
