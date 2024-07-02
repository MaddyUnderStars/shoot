import { addUser } from "./addUser";
import { generateKeys } from "./generateKeys";

export const cliHandlers = {
	"generate-keys": generateKeys,
	"add-user": addUser,
} as { [key: string]: (...rest: string[]) => unknown };
