#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
# update pkgs
apt-get update
apt-get -y upgrade
apt-get -y install apt-utils imagemagick graphicsmagick golang

# build webhook pkg
pushd /usr/src/
git clone https://gitlab.com/cubismod/pipe-to-webhook-ds.git
pushd pipe-to-webhook-ds
go build
chmod +x pipe-to-webhook-ds
cp ./pipe-to-webhook-ds /usr/src/cubemoji
popd
popd

apt-get clean
rm -rf /var/lib/apt/lists*