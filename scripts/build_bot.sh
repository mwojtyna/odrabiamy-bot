#!/bin/bash
./scripts/remove_bot.sh
docker build --build-arg VERSION=$VERSION -t matijas05/odrabiamy-bot:$VERSION .

if [ "$1" == "--run" ]; then
	docker run -d --env-file .env-dev --name odrabiamy-bot matijas05/odrabiamy-bot:$VERSION
fi
if [ "$1" == "--push" ]; then
	./scripts/push_bot.sh
fi
