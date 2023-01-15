# odrabiamy-bot

Discord bot for retrieving data from <https://odrabiamy.pl/>

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
 matijas05/odrabiamy-bot:latest
```

OR

```bash
docker run -d \
 --name odrabiamy-bot \
 --restart unless-stopped \
 --env-file <.env_file_path> \
 -v "/srv/odrabiamy-bot/config:/app/src/config" \
 matijas05/odrabiamy-bot:latest
```

OR (using docker compose)

```yaml
version: '2.1'
services:
  odrabiamy-bot:
    container_name: odrabiamy-bot
    image: matijas05/odrabiamy-bot:latest
    restart: always
    volumes:
      - /srv/odrabiamy-bot/config:/app/src/config
    env_file:
      - .env
```

where env-file is a text file containing environment variables separated by a **new line** and with **no quotes**.

## Environment variables

- `TOKEN`: Discord bot token from your application on <https://discord.com/developers>
- `APP_ID`: Application ID from your application on <https://discord.com/developers>
- `GUILD_ID`: Right-click on your Discord server and choose "Copy ID"
- `EMAIL`: Email of a user that has a premium account on <https://odrabiamy.pl>
- `PASSWORD`: Password of a user that has a premium account on <https://odrabiamy.pl>

## Config folder

The `config` folder contains:

- `config.json` - file that decides which channels are for which books,
- `cookies.json` - prevents having to log in each time a command is executed.

## Config file
File `config.json` decides which books are assigned to which channels. Example:
```jsonc
{
	"1036644889640829018": { // id of the discord channel
		"url": "jezyk-polski/ksiazka-12533/" // part of the url that leads to the specific book
	},
	"1036644889867325594": {
		"url": "matematyka/ksiazka-13007/"
	}
}
```
