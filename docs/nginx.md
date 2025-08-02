# Nginx Configuration

When hosting both the Shoot server and the [client](https://github.com/MaddyUnderStars/shoot-client),
it may be desirable to have them on the same hostname.

You can easily do so via a reverse proxy such as [Nginx](https://nginx.org/)

Below is a sample Nginx configuration to achieve:

- API and S2S on `example.com/api`
- Client on `example.com`

We assume that the client has been built, and the build artefacts have been placed in `/var/www/html`

The below will need some changes not covered here if you wish to have multiple backend servers with load balancing, for example.

You may configure TLS via [Certbot](https://certbot.eff.org/) for example.

Make sure to change any placeholders, wrapped in `<>`

```nginx
server {
	server_name <example.com>;
	listen 80;

	location ~ ^/(api|\.well-known) {
		# Shoot API hosted on `/api` and `.well-known` pass through

		proxy_pass http://127.0.0.1:3001;

		proxy_no_cache 1;
		
		proxy_set_header Host $host;
		proxy_set_header X-Forwarded-For $remote_addr;

		# enable websockets
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";

		# remove the api prefix on the request before sending it to backend
		rewrite /api(/?)(.*) /$2 break;
	}

	location / {
		# Shoot client hosted on `/`

		root /var/www/html;
		index index.html;
		try_files $uri /index.html =404;
	}
}
```