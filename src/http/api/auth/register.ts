import { Response, Router } from "express";
import z from "zod";
import { User } from "../../../entity";
import { HttpError, config, route } from "../../../util";

const router = Router();

const RegisterRequest = z.object({
	username: z.string(),
	password: z.string(),
	email: z.string().optional(),
});

router.post(
	"/register",
	route(
		{ body: RegisterRequest },
		async (req, res: Response<RegisterResponse>) => {
			if (!config.registration.enabled)
				throw new HttpError("Registration is disabled", 400);

			const user = User.create({
				username: req.body.username,
				display_name: req.body.username,
				domain: config.federation.webapp_url.hostname
			});

			await user.save();

			return res.json({ token: "TODO" });
		},
	),
);

export default router;

// TODO: captcha response

interface RegisterResponse {
	token: string;
}
