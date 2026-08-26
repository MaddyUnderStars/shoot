import { Router } from "express";
import z from "zod";
import { InstanceInvite } from "../../../entity/instanceInvite.js";
import { User } from "../../../entity/user.js";
import { config } from "../../../util/config.js";
import { registerUser } from "../../../util/entity/user.js";
import { HttpError } from "../../../util/httperror.js";
import { route } from "../../../util/route.js";

const router = Router();

const RegisterRequest = z.object({
	username: z.string(),
	password: z.string(),
	email: z.string().optional(),
	invite: z.string().optional().describe("Instance registration token"),
});

const RegisterResponse = z.object({
	token: z.string(),
});

router.get(
	"/register",
	route({}, (req, res) => {
		res.render("register", {
			title: "Register",
			server: {
				name: config().general.name ?? config().federation.webapp_url.hostname,
				terms: config().general.terms,
			},
			disabled: !config().registration.enabled,
		});
	}),
);

router.post(
	"/register",
	route(
		{
			body: RegisterRequest,
			response: RegisterResponse,
		},
		async (req, res) => {
			if (!config().registration.enabled && !req.body.invite)
				throw new HttpError("Registration is disabled", 400);

			const { username, email, password } = req.body;

			let invite: InstanceInvite | undefined;

			if (req.body.invite) {
				invite = await InstanceInvite.createQueryBuilder("invite")
					.where("invite.code = :code", { code: req.body.invite })
					.andWhere("(invite.expires > now() or invite.expires is null)")
					.andWhere((qb) => {
						const inner = qb
							.createQueryBuilder()
							.from(User, "users")
							.where("users.invite = invite.code")
							.select("count(*)")
							.getSql();

						return `(invite.maxUses > (${inner}) or invite.maxUses is null)`;
					})
					.leftJoinAndSelect("invite.guild", "guild")
					.getOneOrFail();
			}

			await registerUser(username.toLowerCase(), password, email, false, invite);

			return res.sendStatus(204);
		},
	),
);

export default router;
