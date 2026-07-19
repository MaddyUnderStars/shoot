# Federation

## Supported standards

- [Activitypub](https://www.w3.org/TR/activitypub/)
- [Webfinger](https://datatracker.ietf.org/doc/html/rfc7033)
- [Http Signatures](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures#section-2.1)
- [NodeInfo](https://nodeinfo.diaspora.software/)

- [FEP-2677: Identifying the Application Actor](https://codeberg.org/fediverse/fep/src/commit/f5ab0557712522ebb579c86f165ee1f3152a85d3/fep/2677/fep-2677.md)
- [FEP-2c59: Discovery of a Webfinger address from an ActivityPub actor](https://codeberg.org/fediverse/fep/src/commit/f5ab0557712522ebb579c86f165ee1f3152a85d3/fep/2c59/fep-2c59.md)
- [FEP-1b12: Group federation](https://codeberg.org/fediverse/fep/src/branch/main/fep/1b12/fep-1b12.md)
- [FEP-bebd: Follow Invites](https://codeberg.org/fediverse/fep/src/commit/70c8a451f3226280536623e5bdc853a984d47dae/fep/bebd/fep-bebd.md)
- [FEP-7888: Demystifying the context property](https://codeberg.org/fediverse/fep/src/commit/70c8a451f3226280536623e5bdc853a984d47dae/fep/7888/fep-7888.md)
-   - Currently only used to link guild channels to guilds
- [FEP-2277: ActivityPub core types](https://codeberg.org/fediverse/fep/src/branch/main/fep/2277/fep-2277.md)

## ActivityPub

### Actors and Object Types

Native Shoot actors include:

- `Person` - User accounts
- `Group` - FEP-1b12 Groups for guild channels and group DMs
- `Organization` - Used for guilds

The following activities and object types are currently supported:

- `Follow<Person>` Friend a user
- `Accept<Follow<Person>>` Accept a friend request

- `Follow<Organization>` Join a guild via a FEP-bebd invite
- `Accept<Follow<Organization>>`

- `Join<Group>` Request access to the voice call in this channel
- `Accept<Join<Group>>` Accept a voice call request

- `Create<Note>` can be sent to Person or Group. When sent to Person, creates a DM channel if not exist and sends the message there. When sent to Group, sends the message to the Group
- `Announce<Create<Note>>` can be sent to Person. Sends a message to a channel specified via `announce.actor`

- `Create<Group>` sent when a new DM channel is created to the members of the channel

- [`Role`](https://github.com/MaddyUnderStars/shoot/blob/main/src/util/activitypub/transformers/role.ts#L9) this object contains a `members` collection along with the permissions it's members are allowed and denied. Roles are contained in the the organization's `followers` collection currently.

### HTTP Signatures

By default, all requests must be signed via HTTP signatures including GET requests.

### Guilds

Guilds are represented as Organization actors. Channels inside a guild have a 'context' (per FEP-7888) of the organization's `channels` OrderedCollection.
