# WebRTC (Voice) Support

Shoot supports voice calling via [Janus Gateway](https://github.com/meetecho/janus-gateway).

You must build Janus with the following optional dependencies:
- [libopus](https://opus-codec.org/)
- [libwebsockets](https://libwebsockets.org/). Otherwise, must use Unix sockets. HTTP API is not supported.

You will also need an address to host Shoot's signalling server (preferably a (sub?)domain).

## Shoot Configuration

Shoot has a number of [configuration options](https://github.com/MaddyUnderStars/shoot/blob/main/src/util/config.ts) under the `webrtc` key for configuring webrtc.

The options `webrtc.janus_secret` and `webrtc.janus_url` work with Janus' default config (no secret, on localhost via websocket). You may change this if Janus is hosted on a separate machine or you have configured a secret.

The only option we currently need to set is `webrtc.signal_address`, which is the address of the Shoot signalling server given to clients to negotiate connections.

Shoot by default starts the signalling server on port 3003 (`MEDIA_PORT` env var), even if you're using the single process bootstrap script (`npm run start`).

As with other Shoot services, you may start the signalling server separately via `npm run start:media`

## Nginx Configuration

Below is an example Nginx config for Shoot's signalling server.

Make sure to change any placeholders, wrapped in `<>`

```nginx
server {
	server_name <rtc.example.com>;

	client_max_body_size 50M;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;

	# enable websockets
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    location / {
        proxy_pass http://127.0.0.1:3003;
    }
}
```

## Janus SystemD

Below is an example SystemD unit file for running Janus.

It assumes you have installed Janus at `/opt/janus`.

```ini
[Unit]
Description=Janus Gateway

[Service]
User=ubuntu
WorkingDirectory=/opt/janus/bin
ExecStart=/opt/janus/bin/janus
Restart=always
StandardError=journal
StandardOutput=journal

[Install]
WantedBy=multi-user.target
```