/** Channel ID -> Janus room ID */
const RoomIds: Map<string, number> = new Map();

export const getRoomId = (channel_id: string) => RoomIds.get(channel_id);

export const setRoomId = (channel_id: string, room_id: number) =>
	RoomIds.set(channel_id, room_id);

export const makeRoomId = () => RoomIds.size;
