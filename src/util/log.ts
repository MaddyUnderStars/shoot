import type internal from "node:stream";
import { Writable } from "node:stream";

export const createLogger = (context: string) => {
	context = context.toUpperCase();
	const doLog = (level: LogLevel, ...args: unknown[]) => {
		if (options.level > level) return;

		levelConsoleMap[level](
			`[${context}${options.include_date ? ` ${new Date().toISOString()}` : ""}]`,
			...args,
		);
		return args.join(" ");
	};

	return {
		error: (...args: unknown[]) => doLog(LogLevel.error, ...args),
		warn: (...args: unknown[]) => doLog(LogLevel.warn, ...args),
		msg: (...args: unknown[]) => doLog(LogLevel.msg, ...args),
		verbose: (...args: unknown[]) => doLog(LogLevel.verbose, ...args),
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
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void,
	): void {
		this.logger.msg(String(chunk).trimEnd());
		callback();
	}
}

export const createLogStream = (context: string) => new LogStream(context);

export enum LogLevel {
	verbose = 0,
	msg = 1,
	warn = 2,
	error = 3,
	none = 4,
}

const levelConsoleMap = {
	[LogLevel.verbose]: console.log,
	[LogLevel.msg]: console.log,
	[LogLevel.warn]: console.warn,
	[LogLevel.error]: console.error,
	[LogLevel.none]: () => {},
} satisfies Record<LogLevel, (...data: unknown[]) => void>;

// we can't use config here because importing config ends up parsing it
// bit of an oversight... but we can work around that by exposing a setter
const options = {
	level: LogLevel.verbose,
	include_date: true,
};

export const setLogOptions = (opts: typeof options) => {
	Object.assign(options, opts);
};
