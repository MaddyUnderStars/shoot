# SystemD

Below is an example SystemD service file for Shoot.

You may put it in `/etc/systemd/system/shoot.service`

Be sure to replace any placeholders, wrapped in `<>`.

- `<shoot directory>` refers to the root directory of Shoot.
- `<shoot user>` refers to the user you wish Shoot to run on. It is recommended you create a new user, and that you do not run Shoot as root.

```ini
[Unit]
Description=Shoot Server

[Service]
User=<shoot user>
WorkingDirectory=<shoot directory>
ExecStart=npm run start
Restart=always
StandardError=journal
StandardOutput=journal

[Install]
WantedBy=multi-user.target
```