/*
	TODO:
	- CLI with options:
	-	- Bind address
	-	- Config path
	-	- Admin operations such as creating admin users

	- Config validation
	-	- including activitypub config

	- Maybe a cute ascii logo :3

	- Then start server
*/

import { ChatServer } from "./server";
import { createLogger } from "./util";

const Log = createLogger("bootstrap");
Log.msg("Starting");

// Check nodejs version
const NODE_REQUIRED_VERSION = 18;
const [NODE_MAJOR_VERSION] = process.versions.node.split(".").map(Number);
if (NODE_MAJOR_VERSION < NODE_REQUIRED_VERSION) {
	Log.error(`You are running node version ${NODE_MAJOR_VERSION}. We require a version > ${NODE_REQUIRED_VERSION}. Please upgrade.`);
	process.exit(1);
}

const chatServer = new ChatServer();

chatServer.listen(3001);