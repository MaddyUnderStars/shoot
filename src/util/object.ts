type ReplaceNulls<T> = T extends null ? undefined : T;
type Truthy<T> = {
	[K in keyof T]: ReplaceNulls<T[K]>;
};

export const onlyTruthy = <T extends object>(obj: T): Truthy<T> | undefined => {
	const ret = Object.fromEntries(
		Object.entries(obj).filter(([_, value]) => !!value),
	) as Truthy<T>;

	if (Object.keys(ret).length === 0) return undefined;

	return ret;
};
