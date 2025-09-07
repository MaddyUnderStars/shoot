import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
} from "typeorm";
import { z } from "zod";
import { onlyTruthy } from "../util/object";

export enum EmbedTypes {
	link = 0,
	photo = 1,
	video = 2,
	rich = 3,
}

@Entity("embeds")
export class Embed extends BaseEntity {
	/**
	 * The target of an embed is the URL that it is generated from
	 */
	@PrimaryColumn()
	target: string;

	@CreateDateColumn()
	created_at: Date;

	@Column({ enum: EmbedTypes })
	type: EmbedTypes;

	@Column({ type: String, nullable: true })
	title: string | null;

	@Column({ type: String, nullable: true })
	description: string | null;

	@Column({ type: String, nullable: true })
	author_name: string | null;

	@Column({ type: String, nullable: true })
	author_url: string | null;

	@Column({ type: String, nullable: true })
	footer: string | null;

	@Column({ type: String, nullable: true })
	footer_icon: string | null;

	@Column({ type: String, nullable: true })
	provider_name: string | null;

	@Column({ type: String, nullable: true })
	provider_url: string | null;

	@Column({ type: "simple-json", nullable: true })
	images: EmbedMedia[] | null;

	@Column({ type: "simple-json", nullable: true })
	videos: EmbedMedia[] | null;

	public toPublic = (): PublicEmbed => {
		return {
			target: this.target,
			created_at: this.created_at,
			type: this.type,

			title: this.title ?? undefined,
			description: this.description ?? undefined,

			images: this.images ?? [],
			videos: this.videos ?? [],

			author: onlyTruthy({
				name: this.author_name,
				url: this.author_url,
			}),

			footer: onlyTruthy({
				text: this.footer,
				icon: this.footer_icon,
			}),

			provider: onlyTruthy({
				name: this.provider_name,
				url: this.provider_url,
			}),
		};
	};
}

const EmbedMedia = z.object({
	url: z.string().url(),
	width: z.number().optional(),
	height: z.number().optional(),
	alt: z.string().optional(),
});

export type EmbedMedia = z.infer<typeof EmbedMedia>;

export const PublicEmbed = z
	.object({
		target: z.string().url(),
		created_at: z.date(),
		type: z.nativeEnum(EmbedTypes),

		title: z.string().optional(),
		description: z.string().optional(),

		images: EmbedMedia.array(),
		videos: EmbedMedia.array(),

		author: z
			.object({
				name: z.string().optional(),
				url: z.string().optional(),
			})
			.optional(),

		footer: z
			.object({
				text: z.string().optional(),
				icon: z.string().optional(),
			})
			.optional(),

		provider: z
			.object({
				name: z.string().optional(),
				url: z.string().optional(),
			})
			.optional(),
	})
	.openapi("PublicEmbed");

export type PublicEmbed = z.infer<typeof PublicEmbed>;
