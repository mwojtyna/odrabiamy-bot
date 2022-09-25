#!/bin/bash
docker container stop odrabiamy-bot
docker container rm -f odrabiamy-bot
docker image rm -f matijas05/odrabiamy-bot:1.4.2