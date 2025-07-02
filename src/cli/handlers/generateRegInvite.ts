import { createLogger } from "../../util/log";

const Log = createLogger("cli");

export const generateRegInvite = async (
	code?: string,
	maxUses?: string,
	expiry?: string,
) => {
	const { initDatabase, closeDatabase } = await import("../../util/database");

	await initDatabase();

	const { InstanceInvite } = await import("../../entity/instanceInvite");
	const { generateInviteCode } = await import("../../util/entity/invite");

	if (!code || code === "-1") {
		code = await generateInviteCode(
			async (x) =>
				(await InstanceInvite.count({ where: { code: x } })) !== 0,
		);
	}

	await InstanceInvite.create({
		code,
		expires: !expiry || expiry === "-1" ? null : new Date(expiry),
		maxUses: !maxUses || maxUses === "-1" ? null : Number.parseInt(maxUses),
	}).save();

	Log.msg(`Saved invite with code ${code}`);

	await closeDatabase();
};
