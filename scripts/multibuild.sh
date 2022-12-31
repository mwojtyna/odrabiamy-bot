#!/bin/bash

RED='\033[0;31m'
NC='\033[0m' # No Color

VERSION=$(jq -r '.version' package.json)

docker buildx build \
	--platform linux/arm64/v8,linux/amd64 \
	--build-arg VERSION=$VERSION \
	-t matijas05/odrabiamy-bot:$VERSION \
	-t matijas05/odrabiamy-bot:dev \
	--push \
	.
