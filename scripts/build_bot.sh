#!/bin/bash
VERSION="1.2"

docker build -t matijas05/odrabiamy-bot:$VERSION .
docker run -d --name odrabiamy-bot \
        --env-file ./.env \
        -v "config:/app/src/config" \
        matijas05/odrabiamy-bot:$VERSION
docker cp src/config/cookies.json odrabiamy-bot:/app/src/config/cookies.json