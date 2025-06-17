# How to Deploy Shoot

You can deploy Shoot using either Docker or a bare installation. Follow the steps below for each method.

## Common Steps

Before you begin, you will need a configuration file in JSON format, as the Shoot CLI only supports this format. Below is an example of the configuration file:

```json5
{
  "database": {
    "url": "postgres://user:password@ip/dbname" // Replace with your database credentials
  },
  "federation": {
    "enabled": true,
    "webapp_url": "https://shoot.doesnm.cc/", // Replace with your web application URL
    "instance_url": "https://shoot.doesnm.cc/api", // Replace with your instance API URL
    "require_http_signatures": false // Optional
  }
}
```

Place this configuration file in the `config` directory of Shoot. If you are using Docker, you can place it in the `config` directory of the Shoot repository, but this can be customized.

**TODO:** Describe S3 and Janus integration.

## Deployment with Docker

You can use my Docker image `git.0ut0f.space/doesnm/shoot` or build your own with Dockerfile

### Docker Compose Configuration

You can use the following `docker-compose.yml` file to set up your service:

```yaml
services:
  shoot:
    image: git.0ut0f.space/doesnm/shoot
    restart: always
    volumes:
      - "./shoot/config:/app/config"
      - "./shoot/storage:/app/storage"
    ports:
      - "127.0.0.1:3001:3001"
```

### Commands to Run

1. Generate keys:
   ```bash
   docker compose run --rm shoot npm run cli -- generate-keys
   ```
2. Deploy the application:
   ```bash
   docker compose up -d
   ```

## Deployment Bare

To deploy Shoot without Docker, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/MaddyUnderstars/shoot
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the TypeScript code:
   ```bash
   npm run build
   ```
4. Place the configuration from the first section into the `config` directory as `default.json`.
5. Generate keys:
   ```bash
   npm run cli -- generate-keys
   ```
6. Set up the service with your preferred init system to run:
   ```bash
   npm run start
   ```
   or
   ```bash
   node dist/src/bootstrap.js
   ```

By following these instructions, you should be able to successfully deploy Shoot using either method.