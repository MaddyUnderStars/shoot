import { Router } from "express";
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

const RegisterResponse = z.object({
	token: z.string(),
});

router.post(
	"/register",
	route(
		{ body: RegisterRequest, response: RegisterResponse },
		async (req, res) => {
			if (!config.registration.enabled)
				throw new HttpError("Registration is disabled", 400);

			const { username, email, password } = req.body;

			const user = await registerUser(
				username.toLowerCase(),
				password,
				email,
			);

			return res.json({ token: await generateToken(user.id) });
		},
	),
);

export default router;
