import type { Embed } from "../../../entity/embed.js";
import { genericEmbedGenerator } from "./generic.js";
import { simpleEmbedGenerator } from "./simple.js";

export type EMBED_GENERATOR = (url: URL, head: Response) => Promise<Embed>;

export const EMBED_GENERATORS = {
	simple: simpleEmbedGenerator,
	generic: genericEmbedGenerator,
} as Record<string, EMBED_GENERATOR>;
