import { addUser } from "./addUser.js";
import { generateKeys } from "./generateKeys.js";
import { generateRegInvite } from "./generateRegInvite.js";
import { instance } from "./instance.js";

export const cliHandlers = {
	"generate-keys": generateKeys,
	"generate-reg-invite": generateRegInvite,
	"add-user": addUser,
	instance: instance,
} as { [key: string]: (...rest: string[]) => Promise<Error | void> | Error | void };
