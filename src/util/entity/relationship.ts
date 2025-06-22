import type { APAccept, APFollow } from "activitypub-types";
import { EntityNotFoundError, Not } from "typeorm";
import type { User } from "../../entity";
import { Relationship, RelationshipType } from "../../entity/relationship";
import { getExternalPathFromActor, sendActivity } from "../../sender";
import { addContext } from "../activitypub";
import { emitGatewayEvent } from "../events";
import { makeInstanceUrl } from "../url";

/**
 * Create a relationship.
 * If a relationship exists in the other direction, accept it
 * If block = true, set the appropriate side to block state
 */
export const acceptOrCreateRelationship = async (
	from: User,
	to: User,
	block = false,
	reference_object?: APFollow,
) => {
	// if a relationship exists in the other direction, accept it
	let rel = await Relationship.findOne({
		where: {
			to: { id: from.id },
			from: { id: to.id },
		},
	});

	if (rel) {
		if (block) {
			rel.to_state = RelationshipType.blocked;
			await rel.save();
		} else rel = await acceptRelationship(to, from);
	} else rel = await createRelationship(from, to, block, reference_object);

	return rel;
};

export const createRelationship = async (
	from: User,
	to: User,
	block = false,
	reference_object?: APFollow,
) => {
	const rel = Relationship.create({
		from,
		to,
		// If this is a block, the to_state is ignored
		from_state: block
			? RelationshipType.blocked
			: RelationshipType.accepted,
		to_state: RelationshipType.pending,
		reference_object,
	});

	await rel.save();

	// have to emit two events here as they contain different info
	emitGatewayEvent(to.id, {
		type: "RELATIONSHIP_CREATE",
		relationship: rel.toClient(to.id),
	});

	emitGatewayEvent(from.id, {
		type: "RELATIONSHIP_CREATE",
		relationship: rel.toClient(from.id),
	});

	if (to.isRemote()) {
		// this relationship is being sent by us
		// to a remote user. tell them

		const follow: APFollow = {
			type: "Follow",
			id: makeInstanceUrl(`follow/${rel.id}`),
			actor: makeInstanceUrl(getExternalPathFromActor(from)),
			object: to.remote_address as string, // TODO: type narrowing on classes?
		};

		await sendActivity(to, addContext(follow), from);
	}

	return rel;
};

/**
 * Accept a relationship from user to user. Called by the receiver/to
 */
export const acceptRelationship = async (from: User, to: User) => {
	const rel = await Relationship.findOneOrFail({
		where: {
			from: { id: from.id },
			to: { id: to.id },

			// relationships are created by the sender
			// and so the from_state is accepted and our side is pending
			// There's two states here, because we need to be able to block from either side
			from_state: RelationshipType.accepted,
			to_state: RelationshipType.pending,
		},
		relations: {
			from: true,
			to: true,
		},
	});

	if (!rel || rel.isBlock())
		throw new EntityNotFoundError(Relationship, null);

	rel.to_state = RelationshipType.accepted;
	await Relationship.update(
		{ id: rel.id },
		{ to_state: RelationshipType.accepted },
	);

	// have to emit two events here as they contain different info
	emitGatewayEvent(to.id, {
		type: "RELATIONSHIP_UPDATE",
		relationship: rel.toClient(to.id),
	});

	emitGatewayEvent(from.id, {
		type: "RELATIONSHIP_UPDATE",
		relationship: rel.toClient(from.id),
	});

	if (from.isRemote() && rel.reference_object) {
		// This relationship is from someone on a remote server
		// Accept it

		const accept: APAccept = {
			type: "Accept",
			id: makeInstanceUrl(`accept/${rel.id}`), // TODO: proper URL for these?
			actor: makeInstanceUrl(getExternalPathFromActor(to)),
			object: rel.reference_object.raw,
		};

		await sendActivity(from, addContext(accept), to);
	}

	return rel;
};

/**
 * Fetch all visible relationships for a user
 * That is, relationships where this user is not blocked
 */
export const fetchRelationships = async (user_id: string) => {
	return Relationship.find({
		where: [
			// We created this relationship and aren't blocked by them
			{
				to: { id: user_id },
				to_state: Not(RelationshipType.blocked),
			},
			// Or we are the target, and are not blocked by them
			{
				from: { id: user_id },
				from_state: Not(RelationshipType.blocked),
			},
		],
		relations: { to: true, from: true },
	});
};

export const fetchRelationship = async (from_id: string, to_id: string) => {
	return Relationship.findOneOrFail({
		where: [
			// We created this relationship and aren't blocked
			{
				to: { id: to_id },
				from: { id: from_id },
				to_state: Not(RelationshipType.blocked),
			},
			// Or we are the target of one, and are not blocked
			{
				to: { id: from_id },
				from: { id: to_id },
				from_state: Not(RelationshipType.blocked),
			},
		],
		relations: {
			to: true,
			from: true,
		},
	});
};
