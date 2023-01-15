#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color

VERSION=$(jq -r '.version' package.json)

if [[ $VERSION == *"-dev"* ]]; then
	docker buildx build \
		--platform linux/arm64,linux/amd64 \
		--build-arg VERSION=$VERSION \
		-t matijas05/odrabiamy-bot:dev \
		--push \
		.
else
	docker buildx build \
		--platform linux/arm64,linux/amd64 \
		--build-arg VERSION=$VERSION \
		-t matijas05/odrabiamy-bot:$VERSION \
		-t matijas05/odrabiamy-bot:latest \
		--push \
		.
fi
