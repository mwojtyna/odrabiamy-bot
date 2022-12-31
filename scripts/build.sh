#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color

./scripts/remove_bot.sh
VERSION=$(jq -r '.version' package.json)

docker build --build-arg VERSION=$VERSION -t matijas05/odrabiamy-bot:$VERSION .
docker tag matijas05/odrabiamy-bot:$VERSION matijas05/odrabiamy-bot:dev

if [ "$1" == "--run" ]; then
	read -p "$(echo -e "${RED}Are you sure? Running in local docker container may result in a temporary ban of the premium account ${NC}(y/n) ")" -n 1 -r
	echo

	if [[ $REPLY =~ ^[Yy]$ ]]; then
		docker run -d --env-file .env-dev --name odrabiamy-bot matijas05/odrabiamy-bot:$VERSION
	fi
fi
if [ "$1" == "--push" ]; then
	./scripts/push_bot.sh
fi
