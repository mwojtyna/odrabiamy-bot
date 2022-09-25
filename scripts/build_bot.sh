#!/bin/bash
docker build -t matijas05/odrabiamy-bot:1.4.2 .

if [ "$1" == "--run" ]; then
	docker run -d --env-file .env --name odrabiamy-bot matijas05/odrabiamy-bot:1.4.2
fi
if [ "$1" == "--push" ]; then
	./scripts/push_bot.sh
fi
