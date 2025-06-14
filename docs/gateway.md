# Shoot Gateway

The Shoot Gateway is a websocket server responsible for real-time event notifications.
It's design draws heavy influence from [Discords gateway architecture](https://discord.com/developers/docs/events/gateway#gateway).

This document covers how to login and maintain a connection, and how to use some of the more complex data that you receive from it.

## Gateway Events

Gateway request payloads have the following structure:
```jsonc
{
	"t": "event_name",
	// ...other data
}
```

You can find all [gateway request payloads here](https://github.com/MaddyUnderStars/shoot/blob/main/src/gateway/util/validation/receive.ts)

Gateway response payloads have the following structure:
```jsonc
{
	"t": "EVENT_NAME",
	"s": <integer>,
	"d": {
		// data for this response
	}
}
```

You can find all [gateway response payloads here](https://github.com/MaddyUnderStars/shoot/blob/main/src/gateway/util/validation/send.ts)

By convention, payloads the client sends are lowercase, while payloads the client receives are UPPERCASE.

### Close codes

You may find the list of all close codes the gateway may send you [here](https://github.com/MaddyUnderStars/shoot/blob/main/src/gateway/util/codes.ts)

## Connections

1. Create a websocket connection with the gateway.

The gateway usually is listening on `/`, but consult your instances operator.

2. Send `identify` with your user token.

You must identify within 10 seconds of connecting to the server.
If you do not, the connection will be terminated.

```jsonc
{
	"t": "identify",
	"token": "your user token, obtained via /auth/login"
}
```

3. Maintain a heartbeat message loop

Once you identify, you must start heartbeating. The heartbeat payload is very simple:

```jsonc
{
	"t": "heartbeat",
	"s": <integer>,
}
```

The `s` property is your sessions sequence number, and it increments for every message the gateway sends you. This value is used to track if the client fails to receive or process any gateway events. If you heartbeat with the incorrect sequence number, you will be disconnected.

You must send a heartbeat message at least every 10 seconds. If you do not, you will be disconnected with the close code `4000` (`HEARTBEAT_TIMEOUT`). It is recommend that you add jitter to the interval you send heartbeat messages at, so as to not cause server strain when reconnecting after mass outages, for example. For example, you should send heartbeat messages every 8 seconds, with up to 2 seconds added for every interval.

The heartbeat will continue for the entire duration of the websocket connection.

## Events

### `READY`

The `READY` event is the largest event you will receive, which happens immediately after identifying. It contains all the information necessary to sync initially.

It contains:
- Your private user details
- Your session information
- All your channels
- All the guilds you're in, including their channels and roles
- All your relationships (friends)

## Members List

Rendering the members list is likely the most complex part of your gateway connection.

In order to receive the members list, you must subscribe to a range of users.
When you subscribe to a range, you will receive all the events for the users within that range. If users leave the range, you stop receiving events from them, and inversely if a user moves within the range, you will receive their events.

You may only be subscribed to one range in a channel at a time. Subscribing to a new range unsubscribes you from all other ranges.

Subscribing to a range:
```jsonc
{
	"t": "members",
	"channel_id": "<channel handle>",
	"range": [<integer>, <integer>],
}
```

The `range` prop is two integers such as `0, 100` which corresponds to the range of users between position 0 of the list and position 100.

You will immediately receive a `MEMBERS_CHUNK` event:
```jsonc
{
	"t": "MEMBERS_CHUNK",
	"items": [
		"<role id>",
		{
			"member_id": "<member uuid>",
			"name": "<member display name>"
		},
		// ... other members within range
	]
}
```

The members chunk event contains an `items` array which is a sorted list of member list items.
String values are role IDs, and objects are user members.

Once you are subscribed to a range, you will receive events from the users within it such as `MEMBER_LEAVE`, `ROLE_MEMBER_LEAVE`, `ROLE_MEMBER_ADD` etc.