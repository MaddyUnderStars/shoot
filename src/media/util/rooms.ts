/** Channel ID -> Janus room ID */
const RoomIds: Map<string, number> = new Map();

export const getRoomId = (channel_id: string) => RoomIds.get(channel_id);

export const setRoomId = (channel_id: string, room_id: number) =>
	RoomIds.set(channel_id, room_id);

export const makeRoomId = () => RoomIds.size;

/** Feed ID -> User mention */
const PeerIds: Map<number, string> = new Map();

export const getPeerId = (feed: number) => PeerIds.get(feed);

export const removePeerId = (feed: number) => PeerIds.delete(feed);

export const setPeerId = (feed: number, user_mention: string) =>
	PeerIds.set(feed, user_mention);
