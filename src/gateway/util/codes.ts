// Defined here are close codes we may send
export enum CLOSE_CODES {
	CLOSE_NORMAL = 1000,
	CLOSE_TOO_LARGE = 1009,
	SERVER_ERROR = 1011,
	SERVICE_RESTART = 1012,
	TRY_AGAIN_LATER = 1013,

	/** We did not receive heartbeat in time */
	HEARTBEAT_TIMEOUT = 4000,

	/** We did not receive auth in time */
	IDENTIFY_TIMEOUT = 4001,

	/** We received a payload that failed validation */
	BAD_PAYLOAD = 4002,

	/** The token provided in IDENTIFY was invalid */
	BAD_TOKEN = 4100,
}
