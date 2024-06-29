import { z } from "zod";

const RTCIceCandidate: z.ZodType<RTCIceCandidateInit> = z.object({
	candidate: z.string(),
	sdpMLineIndex: z.number().nullable(),
	sdpMid: z.string().nullable(),
	usernameFragment: z.string().nullable(),
});

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
