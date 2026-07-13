import { CreateDateColumn, Entity, ManyToOne } from "typeorm";
import { BaseModel } from "./basemodel.js";
import type { User } from "./user.js";

@Entity("sessions")
export class Session extends BaseModel {
	@CreateDateColumn()
	created_at: Date;

	@ManyToOne("users", { onDelete: "CASCADE" })
	user: User;

	/*
		TODO:
		- presence
	*/

	public toPrivate() {
		return {
			id: this.id,
			created_at: this.created_at,
			user_id: this.user.id,
		} as PrivateSession;
	}

	public toPublic() {
		return {};
	}
}

export type PrivateSession = Omit<Session, "user"> & { user_id: string };
