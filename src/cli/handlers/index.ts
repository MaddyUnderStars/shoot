import { addUser } from "./addUser";
import { generateKeys } from "./generateKeys";
import { instance } from "./instance";

export const cliHandlers = {
	"generate-keys": generateKeys,
	"add-user": addUser,
	instance: instance,
} as { [key: string]: (...rest: string[]) => unknown };
