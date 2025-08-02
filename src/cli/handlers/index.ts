import { addUser } from "./addUser";
import { generateKeys } from "./generateKeys";
import { generateRegInvite } from "./generateRegInvite";
import { instance } from "./instance";

export const cliHandlers = {
	"generate-keys": generateKeys,
	"generate-reg-invite": generateRegInvite,
	"add-user": addUser,
	instance: instance,
} as { [key: string]: (...rest: string[]) => unknown };
