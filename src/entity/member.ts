import { Entity, ManyToOne } from "typeorm";
import { BaseModel } from "./basemodel";
import { User } from "./user";

@Entity("guild_members")
export class Member extends BaseModel {
	// roles
	// nickname

	@ManyToOne("users")
	user: User;

	public toPublic() {
		return this;
	}

	public toPrivate() {
		return this.toPublic();
	}
}
