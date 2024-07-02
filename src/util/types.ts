// Copyright 2023 Peertube Framasoft https://github.com/Chocobozzz/PeerTube/blob/edc695263f5a33ee012d50fa914ee10a385c9433/packages/typescript-utils/src/types.ts

export type AttributesOnly<T> = {
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	[K in keyof T]: T[K] extends Function ? never : T[K];
};
