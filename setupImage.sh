#!/bin/bash
# sets up requisite packages for the docker image using this as
# a reference: https://pythonspeed.com/articles/system-packages-docker/
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get -y upgrade
apt-get -y install apt-utils
apt-get -y remove imagemagick imagemagick-6.q16

# manual install of imagemagick so we can get q8 quality instead of 16 for speedier performance
cd ~
git clone https://github.com/ImageMagick/ImageMagick.git ImageMagick
cd ImageMagick
# try and clean up the install as much as possible and remove bloat
./configure --with-quantum-depth=8 --without-magick-plus-plus --without-perl --without-dps \
--without-freetype --without-jbig --without-tiff --without-wmf --without-xml --enable-hdri=no --enable-shared=yes
make
make install
ldconfig /usr/local/lib

# get imagemagick installed
apt-get -y install --no-install-recommends graphicsmagick
apt autoremove -y

# Delete cached files we don't need anymore:
apt-get clean
rm -rf /var/lib/apt/lists/*