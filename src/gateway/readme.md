# Gateway

Real time communication with connected clients about events like message/channel/guild CRUD

On client connect:

1. Client sends Identify to authenticate
2. Gateway responds Ready with initial sync data: guilds, channels, relationships, presence data
3. On CRUD for objects client cares about, Gateway sends those events
