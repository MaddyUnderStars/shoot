# Docker

Shoot provides a Dockerfile and docker-compose file.

The docker-compose file will:
- Set up a basic Shoot instance (single process `npm run start` equivalent)
- Set up a postgres database

It will not:
- Set up Nginx
- Set up Janus
- Set up RabbitMQ
- Set up Redis

It is a bare-bones installation for those who wish to get up and running quickly.
For those who wish to set up more sophisticated Shoot instances, you must still do so manually.

## Usage

Requirements:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/install/)

Simply run the following:

```sh
docker compose up
```

You will now have a Shoot instance running on port `3000`

## Configuration

Shoot configuration is mounted on `./config`.
You may use the Shoot CLI to generate keys as normal.

The Postgres database is persisted via a volume. Do not compose down as you will lose the volume.
User content uploaded to Shoot (i.e. when not using s3) is also persisted to a volume.

## CLI

Set Shoot's `database.url` config to `postgres://postgres:postgres@localhost` as defined by `docker-compose.yml`.

You may now use the Shoot CLI as normal. If you wish to do database operations, the postgres container must up.

You do not need to make any changes to config when you restart the Shoot container, as the docker compose file overwrites the `database.url`.