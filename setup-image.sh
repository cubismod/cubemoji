#!/bin/bash
# sets up requisite packages for the docker image using this as
# a reference: https://pythonspeed.com/articles/system-packages-docker/
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get -y install apt-utils
apt-get -y upgrade
apt-get -y remove imagemagick imagemagick-6.q16

# get imagemagick installed
apt-get -y install --no-install-recommends graphicsmagick
apt-get autoremove -y
apt-get autoclean -y

# Delete cached files we don't need anymore:
apt-get clean
rm -rf /var/lib/apt/lists/*