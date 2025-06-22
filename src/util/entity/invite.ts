import crypto from "node:crypto";
import { Invite } from "../../entity/invite";

const CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let INVITE_LENGTH = 5;

export const generateInviteCode = async () => {
	let code: string | undefined = undefined;

	while (!code) {
		const tryCode = Array.from(
			crypto.randomFillSync(new Uint32Array(INVITE_LENGTH)),
		)
			.map((x) => CHARACTERS[x % CHARACTERS.length])
			.join("");

		if ((await Invite.count({ where: { code: tryCode } })) !== 0) {
			// failed
			INVITE_LENGTH++;
			continue;
		}

		code = tryCode;
	}

	return code;
};
