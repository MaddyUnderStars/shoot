export enum InstanceBehaviour {
	/** allow all content */
	ALLOW = "allow",

	/**
	 * only allow content if the remote user has a relationship with a local user
	 * force remote users to be approved by guild before joining (force-knockjoin)
	 *
	 * e.g. a limited remote user can only send us dms if we are friends.
	 * they can send a friend request only if we share a guild.
	 * they can only join a guild by being accepted by a user in the guild with permission (knocking)
	 */
	LIMIT = "limit",

	/**
	 * block all content from this instance,
	 * and block this instance from getting our (http sig required) content
	 */
	BLOCK = "block",
}
