# odrabiamy-bot
Discord bot for retrieving data from https://odrabiamy.pl/

# CAUTION!
From version 1.3 up, the docker image is only for arm64v8 platform!

## Starting the bot:
```bash
docker run -d \
	--name odrabiamy-bot \
	-e TOKEN="<token>" \
	-e APP_ID="<app_id>" \
	-e GUILD_ID="<guild_id>" \
	-e EMAIL="<email>" \
	-e PASSWORD="<password>" \
	-v "config:/app/src/config" \
	matijas05/odrabiamy-bot:1.3
```
OR
```bash
docker run -d --name odrabiamy-bot \
	--env-file <.env_file_path> \
	-v "config:/app/src/config" \
	matijas05/odrabiamy-bot:1.3
```
where env-file is a text file containing environment variables separated by a <ins>**new line**</ins> and with <ins>**no quotes**</ins>.

## Environment variables
- TOKEN: Discord bot token from your application on https://discord.com/developers
- APP_ID: Application ID from your application on https://discord.com/developers
- GUILD_ID: Right-click on your Discord server and choose "Copy ID"
- EMAIL: Email of a user that has a premium account on https://odrabiamy.pl
- PASSWORD: Password of a user that has a premium account on https://odrabiamy.pl

## Config
"config" volume contains:
 - `config.json` - file that decides which channels are for which books,
 - `cookies.json` - sometimes Captcha gets in the way when logging in, so if the bot gives a timeout error, copy this file from a local instance of the bot.