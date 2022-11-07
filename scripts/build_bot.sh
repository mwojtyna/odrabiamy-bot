#!/bin/bash
BLUE='\033[0;34m'
NC='\033[0m' # No Color

./scripts/remove_bot.sh
docker build --build-arg VERSION=$VERSION -t matijas05/odrabiamy-bot:$VERSION .
if [[ "$VERSION" == *"-dev"* ]]; then
	echo -e "${BLUE}Creating 'dev' image...${NC}"
	docker tag matijas05/odrabiamy-bot:$VERSION matijas05/odrabiamy-bot:dev
else
	echo -e "${BLUE}Creating 'latest' image...${NC}"
	docker tag matijas05/odrabiamy-bot:$VERSION matijas05/odrabiamy-bot:latest
fi

if [ "$1" == "--run" ]; then
	docker run -d --env-file .env-dev --name odrabiamy-bot matijas05/odrabiamy-bot:$VERSION
fi
if [ "$1" == "--push" ]; then
	./scripts/push_bot.sh
fi
