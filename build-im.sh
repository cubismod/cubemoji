#!/bin/bash
# builds imagemagick from source

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