#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color

docker push matijas05/odrabiamy-bot:$VERSION

if [[ "$VERSION" == *"-dev"* ]]; then
	echo -e "${BLUE}Pushing 'dev' image...${NC}"
	docker push matijas05/odrabiamy-bot:dev
else
	echo -e "${RED}Refused to push a non-development docker image.${NC}"
	exit 1
fi
