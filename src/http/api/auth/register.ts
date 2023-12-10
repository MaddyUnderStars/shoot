import { Response, Router } from "express";
import z from "zod";
import {
	HttpError,
	config,
	generateToken,
	registerUser,
	route,
} from "../../../util";

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

			const { username, email, password } = req.body;

			const user = await registerUser(username, password, email);

			return res.json({ token: await generateToken(user.id) });
		},
	),
);

export default router;

// TODO: captcha response

interface RegisterResponse {
	token: string;
}
