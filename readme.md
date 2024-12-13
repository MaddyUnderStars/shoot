# Shoot - Federated Instant Messenger

Shoot is a (work in progress) instant messenger for the fediverse.

Connect with your friends on Shoot or other federated services like Mastodon, Pixelfed, \*key with
direct messenges, group chats, and guilds.

Planned featureset:

-   Direct messenging
-   Group chats
-   Guilds, containing channels and roles
-   Voice and video chat(?)
-   End to end encryption(?)
-   Instantly messenge your friends on other Activitypub federated services
-   Various trust/safety/antispam features

## Getting Started

Requires:
- Nodejs version 18 or higher
- Postgresql
- Git
- Optional: [Janus media server](https://janus.conf.meetecho.com/) for voice chat support
- Optional: [Redis](https://redis.io/) can be used for the inbound federation queue.

Once you have all the prerequisites set up, download and build the server:

```sh
# clone/download the latest server code
git clone https://github.com/MaddyUnderStars/shoot.git
cd shoot

npm i # install dependencies

npm run build
```

You should now create a config file.
Shoot uses the [config](https://www.npmjs.com/package/config) package for reading config files. By defualt, they will be read from the `config` directory, and supports [many file formats](https://github.com/node-config/node-config/wiki/Configuration-Files#file-formats), although Shoot's CLI only supports JSON.

You can find all available config options along with their documentation [here](https://github.com/MaddyUnderStars/shoot/blob/main/src/util/config.ts)

You can use `npm run cli -- generate-keys` to generate the public and private keys needed for federation. *You still need to enable federation by setting `federation.enaled` to `true`*
This command will also generate the JWT token used for user authentication.

Once you have your config file, you can start the server with:
```sh
npm run start
```

While you're in the server's CLI, you may also create a new user using the command:
```sh
npm run cli -- add-user [username]
```

Now you'll need a client. Head over to [shoot-client](https://github.com/MaddyUnderStars/shoot-client) for the official Shoot client.

## Contributing

I've become pretty busy with my job, so I haven't had the time to work on Shoot.
I would love if anyone interested could contribute to the project.
Feel free to open any issues or pull requests, and I'll review them when I have the time.

### Tests

You can run the tests with `npm run test`.
Shoot uses [Ava](https://github.com/avajs/ava) for testing.