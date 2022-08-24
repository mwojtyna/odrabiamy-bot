# odrabiamy-bot
Discord bot for retrieving data from https://odrabiamy.pl/

## Starting the bot:
```bash
docker run -d \
	--name odrabiamy-bot \
	-e TOKEN="<token>" \
	-e APP_ID="<app_id>" \
	-e GUILD_ID="<guild_id>" \
	-e USERNAME="<username>" \
	-e PASSWORD="<password>" \
	matijas05/odrabiamy-bot:<image_version>
```
OR
```bash
docker run -d --name odrabiamy-bot --env-file <.env_file_path> matijas05/odrabiamy-bot:<image_version>
```
where env-file is a text file containing environment variables separated by a <ins>**new line**</ins> and with <ins>**no quotes**</ins>.

## Environment variables
- TOKEN: Discord bot token from your application on https://discord.com/developers
- APP_ID: Application ID from your application on https://discord.com/developers
- GUILD_ID: Right-click on your Discord server and choose "Copy ID"
- USERNAME: Username of a user that has a premium account on https://odrabiamy.pl
- PASSWORD: Password of a user that has a premium account on https://odrabiamy.pl