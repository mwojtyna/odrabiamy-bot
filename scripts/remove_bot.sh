#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color

docker container rm -f odrabiamy-bot
docker image rm -f matijas05/odrabiamy-bot:$VERSION

if [[ "$VERSION" == *"-dev"* ]]; then
	docker image rm -f matijas05/odrabiamy-bot:dev
else
	echo -e "${RED}Refused to remove a non-development docker image.${NC}"
	exit 1
fi
