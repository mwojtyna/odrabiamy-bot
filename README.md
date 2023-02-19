# odrabiamy-bot

Discord bot for retrieving data from <https://odrabiamy.pl/> using only 1 premium account. It requires you to create a Discord bot and to [assign a Discord channel id with a specific book](#config-file). Then, you can go to the specific Discord channel and run the `/zad` command. On first run it always logs in for you, which will take some time. Each consecutive run will be shorter, because the cookies are saved.

It is recommended to host the bot on a server that is placed in Poland, because otherwise odrabiamy.pl checks for suspicious activity.

## Starting the bot

Place the [config.json](#config-file) file inside an empty folder on your local machine. Then, run the bot using one of the methods below (remember to replace the env variables and the config folder path):

```bash
docker run -d \
 --name odrabiamy-bot \
 --restart unless-stopped \
 -e TOKEN="token" \
 -e APP_ID="app_id" \
 -e GUILD_ID="guild_id" \
 -e EMAIL="email" \
 -e PASSWORD="password" \
 -v "path_to_your_config_folder:/app/src/config" \
 matijas05/odrabiamy-bot:latest
```

OR

```bash
docker run -d \
 --name odrabiamy-bot \
 --restart unless-stopped \
 --env-file "env_file_path" \
 -v "path_to_your_config_folder:/app/src/config" \
 matijas05/odrabiamy-bot:latest
```

OR (using docker compose)

```yaml
version: '2.1'
services:
  odrabiamy-bot:
    container_name: odrabiamy-bot
    image: matijas05/odrabiamy-bot:latest
    restart: unless-stopped
    environment:
      - TOKEN=token
      - APP_ID=id
      - GUILD_ID=id
      - EMAIL=email
      - PASSWORD=password
    volumes:
      - path_to_your_config_folder:/app/src/config
```

OR (using docker compose)

```yaml
version: '2.1'
services:
  odrabiamy-bot:
    container_name: odrabiamy-bot
    image: matijas05/odrabiamy-bot:latest
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - path_to_your_config_folder:/app/src/config
```

where env-file is a text file containing environment variables (e.g. VARIABLE=value) separated by a **new line** and with **no quotes**.

## Environment variables

- `TOKEN`: Discord bot token from your application on <https://discord.com/developers>
- `APP_ID`: Application ID from your application on <https://discord.com/developers>
- `GUILD_ID`: Right-click on your Discord server and choose "Copy ID"
- `EMAIL`: Email of a user that has a premium account on <https://odrabiamy.pl>
- `PASSWORD`: Password of a user that has a premium account on <https://odrabiamy.pl>

## Config folder

The `config` folder contains:

- `config.json` - file that you must add which decides which Discord channels are for which books,
- `cookies.json` - auto-generated file that prevents having to log in to `odrabiamy.pl` each time a command is executed.

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
