#!/bin/bash
# simple script to just build and run docker image
docker build -t cubis/cubemoji .
docker run -d --restart unless-stopped cubis/cubemoji
