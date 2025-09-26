import {
	BaseEntity,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryColumn,
} from "typeorm";
import type { User } from "./user";

/**
 * Web Push subscriptions
 * https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription
 */
@Entity("push_subscriptions")
export class PushSubscription extends BaseEntity {
	@PrimaryColumn()
	userId: string;

	@ManyToOne("users", { onDelete: "CASCADE" })
	user: User;

	/**
	 * The name of the device/browser associated with this subscription
	 */
	@PrimaryColumn()
	name: string;

	/**
	 * The PushSubscription endpoint
	 */
	@Column()
	endpoint: string;

	@Column()
	p256dh: string;

	@Column()
	auth: string;

	@CreateDateColumn()
	created: Date;

	public asStandard() {
		return {
			endpoint: this.endpoint,
			expirationTime: null,
			keys: {
				p256dh: this.p256dh,
				auth: this.auth,
			},
		};
	}
}
