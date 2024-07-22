import type internal from "node:stream";
import { Writable } from "node:stream";

export const createLogger = (context: string) => {
	context = context.toUpperCase();
	const doLog = (level: "error" | "warn" | "log", ...args: unknown[]) => {
		console[level](`[${context} ${new Date().toISOString()}]`, ...args);
		return args.join(" ");
	};

	return {
		error: (...args: unknown[]) => doLog("error", ...args),
		warn: (...args: unknown[]) => doLog("warn", ...args),
		msg: (...args: unknown[]) => doLog("log", ...args),
		verbose: (...args: unknown[]) => doLog("log", ...args),
	};
};

class LogStream extends Writable {
	private logger;

	constructor(context: string, opts?: internal.WritableOptions) {
		super(opts);
		this.logger = createLogger(context);
	}

	_write(
		chunk: unknown,
		encoding: BufferEncoding,
		callback: (error?: Error | null) => void,
	): void {
		this.logger.msg(String(chunk).trimEnd());
		callback();
	}
}

export const createLogStream = (context: string) => new LogStream(context);
