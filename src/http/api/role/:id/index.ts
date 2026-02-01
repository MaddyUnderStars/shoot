import { Router } from "express";
import z from "zod";
import { PublicRole, Role } from "../../../../entity/role";
import { isMemberOfGuildThrow } from "../../../../util/entity/member";
import { route } from "../../../../util/route";

const router = Router({ mergeParams: true });

const params = z.object({ role_id: z.string() });

router.get(
	"/",
	route({ params, response: PublicRole }, async (req, res) => {
		const role = await Role.findOneOrFail({
			where: { id: req.params.role_id },
			relations: { guild: true },
		});

		await isMemberOfGuildThrow(role.guild.mention, req.user);

		return res.json(role.toPublic());
	}),
);

export default router;
