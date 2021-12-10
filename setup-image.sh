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

apt-get clean
rm -rf /var/lib/apt/lists*