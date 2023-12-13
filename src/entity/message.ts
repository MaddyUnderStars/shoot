import { Entity } from "typeorm";
import { BaseModel } from "./basemodel";

@Entity()
export class Message extends BaseModel {
	

	public toPublic(): PublicMessage {
		return {
			id: this.id,
		}
	}

	public toPrivate() {
		return this.toPublic();
	}
}

export type PublicMessage = Pick<Message, "id">;