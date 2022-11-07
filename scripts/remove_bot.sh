#!/bin/bash
docker container rm -f odrabiamy-bot
docker image rm -f matijas05/odrabiamy-bot:$VERSION

if [[ "$VERSION" == *"-dev"* ]]; then
	docker image rm -f matijas05/odrabiamy-bot:dev
else
	docker image rm -f matijas05/odrabiamy-bot:latest
fi
