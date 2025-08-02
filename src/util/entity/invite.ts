import crypto from "node:crypto";
import { Invite } from "../../entity/invite";

const CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let INVITE_LENGTH = 5;

const DEFAULT_INVITE_EXISTS_CHECK = async (code: string) => {
	return (await Invite.count({ where: { code } })) !== 0;
};

export const generateInviteCode = async (
	exists = DEFAULT_INVITE_EXISTS_CHECK,
) => {
	let code: string | undefined;

	while (!code) {
		const tryCode = Array.from(
			crypto.randomFillSync(new Uint32Array(INVITE_LENGTH)),
		)
			.map((x) => CHARACTERS[x % CHARACTERS.length])
			.join("");

		if (await exists(tryCode)) {
			// failed
			INVITE_LENGTH++;
			continue;
		}

		code = tryCode;
	}

	return code;
};
