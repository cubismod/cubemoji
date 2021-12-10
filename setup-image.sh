#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
# update pkgs
apt-get update
apt-get -y upgrade
apt-get -y install apt-utils imagemagick graphicsmagick

pushd /usr/src/cubemoji
mkdir download
mkdir data
popd

apt-get clean
rm -rf /var/lib/apt/lists*

npm install -g npm@8.3.0