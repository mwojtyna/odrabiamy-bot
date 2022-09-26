# odrabiamy-bot v1.5.0

Discord bot for retrieving data from <https://odrabiamy.pl/>

## CAUTION

From version 1.3 up, the docker image is only for arm64v8 platform!

## Starting the bot

```bash
docker run -d \
 --name odrabiamy-bot \
 --restart unless-stopped \
 -e TOKEN="<token>" \
 -e APP_ID="<app_id>" \
 -e GUILD_ID="<guild_id>" \
 -e EMAIL="<email>" \
 -e PASSWORD="<password>" \
 -v "/srv/odrabiamy-bot/config:/app/src/config" \
 matijas05/odrabiamy-bot:1.5.0
```

OR

```bash
docker run -d \
 --name odrabiamy-bot \
 --restart unless-stopped \
 --env-file <.env_file_path> \
 -v "/srv/odrabiamy-bot/config:/app/src/config" \
 matijas05/odrabiamy-bot:1.5.0
```

OR (using docker compose)

```yaml
version: '2.1'
services:
  odrabiamy-bot:
    container_name: odrabiamy-bot
    image: matijas05/odrabiamy-bot:1.5.0
    restart: always
    volumes:
      - /srv/odrabiamy-bot/config:/app/src/config
    env_file:
      - .env
```

where env-file is a text file containing environment variables separated by a **new line** and with **no quotes**.

## Environment variables

- TOKEN: Discord bot token from your application on <https://discord.com/developers>
- APP_ID: Application ID from your application on <https://discord.com/developers>
- GUILD_ID: Right-click on your Discord server and choose "Copy ID"
- EMAIL: Email of a user that has a premium account on <https://odrabiamy.pl>
- PASSWORD: Password of a user that has a premium account on <https://odrabiamy.pl>

## Config

"config" volume contains:

- `config.json` - file that decides which channels are for which books,
- `cookies.json` - prevents having to log in each time a command is executed.
