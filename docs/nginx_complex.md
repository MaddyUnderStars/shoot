# Nginx Configuration

When you scale up your deployment, it may be useful to horizontally scale Shoot's services.

Below is a sample Nginx configuration to achieve:
- Load balanced API/S2S on `api.example.com`
- Load balanced Gateway on `gateway.example.com`

Requirements:
- [RabbitMQ](https://www.rabbitmq.com/)
- Running Shoot as individual services (npm `start:http`, `start:gateway` etc)

Make sure to change any placeholders, wrapped in `<>`

```nginx
upstream api {
	server <127.0.0.1:3001>;	# first API server
	server <127.0.0.1:4001>;	# second API server
	# ... additional API servers.

	# See https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
}

upstream gateway {
	# ensure users reconnect to the same gateway
	ip_hash;

	server <127.0.0.1:3002>;	# first gateway server
	server <127.0.0.1:4002>;	# second gateway server
	# ... additional gateway servers.
}

server {
	server_name <api.example.com>;
	listen 80;

	location / {
		proxy_pass http://api;

		proxy_no_cache 1;
		
		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $remote_addr;
	}
}

server {
	server_name <gateway.example.com>;
	listen 80;

	location / {
		proxy_pass http://gateway;

		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $remote_addr;

		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
	}
}
```