import type { Embed } from "../../../entity/embed";
import { genericEmbedGenerator } from "./generic";
import { simpleEmbedGenerator } from "./simple";

export type EMBED_GENERATOR = (url: URL, head: Response) => Promise<Embed>;

export const EMBED_GENERATORS = {
	simple: simpleEmbedGenerator,
	generic: genericEmbedGenerator,
} as Record<string, EMBED_GENERATOR>;
