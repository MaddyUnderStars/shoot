import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
} from "typeorm";
import { z } from "zod";

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
	author_name: string | null;

	@Column({ type: String, nullable: true })
	author_url: string | null;

	@Column({ type: String, nullable: true })
	provider_name: string | null;

	@Column({ type: String, nullable: true })
	provider_url: string | null;

	@Column({ type: String, nullable: true })
	thumbnail_url: string | null;

	@Column({ type: Number, nullable: true })
	thumbnail_width: number | null;

	@Column({ type: Number, nullable: true })
	thumbnail_height: number | null;

	@Column({ type: Number, nullable: true })
	width: number | null;

	@Column({ type: Number, nullable: true })
	height: number | null;

	@Column({ type: String, nullable: true })
	url: string | null;

	@Column({ type: String, nullable: true })
	html: string | null;

	public toPublic() {
		return {
			target: this.target,
			type: EmbedTypes[this.type],
			title: this.title ?? undefined,
			author_name: this.author_name ?? undefined,
			author_url: this.author_url ?? undefined,
			provider_name: this.provider_name ?? undefined,
			provider_url: this.provider_url ?? undefined,
			thumbnail_url: this.thumbnail_url ?? undefined,
			thumbnail_width: this.thumbnail_width ?? undefined,
			thumbnail_height: this.thumbnail_height ?? undefined,

			width: this.width ?? undefined,
			height: this.height ?? undefined,
			url: this.url,
			html: this.html ?? undefined,
		} as PublicEmbed;
	}
}

export type PublicEmbed = z.infer<typeof PublicEmbed>;

export const PublicEmbed = z
	.object({
		target: z.string().url(),
		title: z.string().optional(),
		author_name: z.string().optional(),
		author_url: z.string().optional(),
		provider_name: z.string().optional(),
		provider_url: z.string().optional(),
		thumbnail_url: z.string().optional(),
		thumbnail_width: z.number().optional(),
		thumbnail_height: z.number().optional(),
	})
	.and(
		z.union([
			z.object({
				type: z.literal("link"),
			}),
			z.object({
				type: z.literal("photo"),
				url: z.string().url(),
				width: z.number().min(1),
				height: z.number().min(1),
			}),
			z.object({
				type: z.literal("video"),
				html: z.string(),
				width: z.number().min(1),
				height: z.number().min(1),
			}),
			z.object({
				type: z.literal("rich"),
				html: z.string(),
				width: z.number(),
				height: z.number(),
			}),
		]),
	)
	.openapi("PublicEmbed");
