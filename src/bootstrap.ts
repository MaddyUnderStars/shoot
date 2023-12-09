/*
	TODO:
	- CLI with options:
	-	- Bind address
	-	- Config path
	-	- Admin operations such as creating admin users

	- Config validation
	-	- including activitypub config

	- Nodejs version validation

	- Maybe a cute ascii logo :3

	- Then start server
*/

import { ChatServer } from "./server";
import { createLogger } from "./util";

const Log = createLogger("bootstrap");
Log.msg("Starting")

const chatServer = new ChatServer();

chatServer.listen(3001);