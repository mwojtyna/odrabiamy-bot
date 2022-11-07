#!/bin/bash
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Pushing $VERSION image...${NC}"
docker push matijas05/odrabiamy-bot:$VERSION

if [[ "$VERSION" == *"-dev"* ]]; then
	echo -e "${BLUE}Pushing 'dev' image...${NC}"
	docker push matijas05/odrabiamy-bot:dev
else
	echo -e "${BLUE}Pushing 'latest' image...${NC}"
	docker push matijas05/odrabiamy-bot:latest
fi
