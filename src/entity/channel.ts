import { Column, Entity } from "typeorm";
import { BaseModel } from "./basemodel";

@Entity("channels")
export class Channel extends BaseModel {
	@Column()
	name: string;

	// todo: guilds

	public toPublic(): unknown {
		return {}
	}

	public toPrivate(): unknown {
		return this.toPublic();
	}
}