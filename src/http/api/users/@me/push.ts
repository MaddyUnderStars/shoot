import { Router } from "express";
import z from "zod";
import { PushSubscription } from "../../../../entity/pushSubscription";
import { route } from "../../../../util/route";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			response: z
				.object({
					name: z.string(),
					created: z.date(),
				})
				.array(),
		},
		async (req, res) => {
			const subscriptions = await PushSubscription.find({
				where: { userId: req.user.id },
			});

			return res.json(
				subscriptions.map((x) => ({
					name: x.name,
					created: x.created,
				})),
			);
		},
	),
);

router.post(
	"/",
	route(
		{
			body: z.object({
				name: z.string(),
				endpoint: z.string().url(),
				p256dh: z.string(),
				auth: z.string(),
			}),
			errors: { 204: z.literal("No Content") },
		},
		async (req, res) => {
			const subscription = PushSubscription.create({
				userId: req.user.id,
				name: req.body.name,
				endpoint: req.body.endpoint,
				p256dh: req.body.p256dh,
				auth: req.body.auth,
			});

			await subscription.save();

			return res.sendStatus(204);
		},
	),
);

router.delete(
	"/:name",
	route(
		{
			params: z.object({
				name: z.string(),
			}),
			errors: { 202: z.literal("Accepted") },
		},
		async (req, res) => {
			await PushSubscription.delete({
				name: req.params.name,
				userId: req.user.id,
			});

			return res.sendStatus(202);
		},
	),
);

export default router;
