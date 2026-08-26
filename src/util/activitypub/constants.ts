import z from "zod";

export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";

export const ACTIVITY_JSON_ACCEPT = [
	'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
	"application/ld+json", // body parser doesn't like profile... bug?
	"application/activity+json",
];

export const ActorMentionRegex = /^.*@.*$/;

export const ActorMention = z
	.custom<`${string}@${string}`>(
		(val) => typeof val === "string" && val.match(ActorMentionRegex),
		{
			message: "Invalid mention",
		},
	)
	.openapi("ActorMention", {
		type: "string",
		pattern: ActorMentionRegex.source,
	});

export type ActorMention = z.infer<typeof ActorMention>;

interface WebfingerLink {
	rel: string;
	type?: string;
	href?: string;
	template?: string;
}

export interface WebfingerResponse {
	subject: string;
	aliases?: string[];
	links: WebfingerLink[];
}

export const WebfingerResponse: z.ZodType<WebfingerResponse> = z.object({
	subject: z.string(),
	aliases: z.string().array().optional(),
	links: z
		.object({
			rel: z.string(),
			type: z.string().optional(),
			href: z.string().optional(),
			template: z.string().optional(),
		})
		.array(),
});
