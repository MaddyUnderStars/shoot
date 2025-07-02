import { Router } from "express";
import z from "zod";
import { InstanceInvite } from "../../../entity/instanceInvite";
import { User } from "../../../entity/user";
import { config } from "../../../util/config";
import { registerUser } from "../../../util/entity/user";
import { HttpError } from "../../../util/httperror";
import { route } from "../../../util/route";
import { generateToken } from "../../../util/token";

const router = Router();

const RegisterRequest = z.object({
	username: z.string(),
	password: z.string(),
	email: z.string().optional(),
	invite: z.string().optional().describe("Instance registration invite"),
});

const RegisterResponse = z.object({
	token: z.string(),
});

router.post(
	"/register",
	route(
		{ body: RegisterRequest, response: RegisterResponse },
		async (req, res) => {
			if (!config.registration.enabled && !req.body.invite)
				throw new HttpError("Registration is disabled", 400);

			const { username, email, password } = req.body;

			let invite: InstanceInvite | null;

			if (req.body.invite) {
				invite = await InstanceInvite.createQueryBuilder("invite")
					.where("invite.code = :code", { code: req.body.invite })
					.andWhere(
						"(invite.expires < now() or invite.expires is null)",
					)
					.andWhere((qb) => {
						const inner = qb
							.createQueryBuilder()
							.from(User, "users")
							.where("users.invite = invite.code")
							.select("count(*)")
							.getSql();

						return `(invite.maxUses > (${inner}) or invite.maxUses is null)`;
					})
					.getOneOrFail();
			}

			const user = await registerUser(
				username.toLowerCase(),
				password,
				email,
				false,
				invite,
			);

			return res.json({ token: await generateToken(user.id) });
		},
	),
);

export default router;
