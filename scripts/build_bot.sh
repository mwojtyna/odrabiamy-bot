#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color

./scripts/remove_bot.sh

if [[ "$VERSION" == *"-dev"* ]]; then
	docker build --build-arg VERSION=$VERSION -t matijas05/odrabiamy-bot:$VERSION .
	docker tag matijas05/odrabiamy-bot:$VERSION matijas05/odrabiamy-bot:dev
else
	echo -e "${RED}Refused to create a non-development docker image.${NC}"
	exit 1
fi

if [ "$1" == "--run" ]; then
	docker run -d --env-file .env-dev --name odrabiamy-bot matijas05/odrabiamy-bot:$VERSION
fi
if [ "$1" == "--push" ]; then
	./scripts/push_bot.sh
fi
