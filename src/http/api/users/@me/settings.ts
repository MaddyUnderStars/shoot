import { Router } from "express";
import z from "zod";
import {
	ChannelNotificationPreferences,
	UserChannelSettings,
} from "../../../../entity/userChannelSettings";
import {
	PrivateUserSettings,
	UserSetting,
} from "../../../../entity/userSetting";
import { ActorMention } from "../../../../util/activitypub/constants";
import { getDatabase } from "../../../../util/database";
import { route } from "../../../../util/route";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ response: PrivateUserSettings }, async (req, res) => {
		return res.json(
			(
				await UserSetting.findOneOrFail({
					where: {
						userId: req.user.id,
					},
					relations: {
						channelSettings: true,
					},
				})
			).toPrivate(),
		);
	}),
);

router.patch(
	"/",
	route(
		{
			body: z.object({
				channels: z.array(
					z.object({
						id: ActorMention,
						notifications: z
							.nativeEnum(ChannelNotificationPreferences)
							.optional(),
						muted_until: z.date().optional(),
					}),
				),
			}),
			errors: { 204: z.literal("No Content") },
		},
		async (req, res) => {
			await getDatabase().transaction(async (transaction) => {
				const channelRepo =
					transaction.getRepository(UserChannelSettings);

				for (const ch of req.body.channels) {
					if (Object.keys(ch).length === 1) {
						// delete this preference
						await channelRepo.delete({
							channelId: ch.id,
							userSettingsUserId: req.user.id,
						});
					} else {
						await channelRepo.upsert(
							UserChannelSettings.create({
								channelId: ch.id,
								userSettingsUserId: req.user.id,
								notifications: ch.notifications,
								muted_until: ch.muted_until,
							}),
							{
								conflictPaths: {
									channelId: true,
									userSettingsUserId: true,
								},
							},
						);
					}
				}
			});

			res.sendStatus(204);
		},
	),
);

export default router;
