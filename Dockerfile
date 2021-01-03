ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

RUN apk add --no-cache \
    nodejs \
    npm \
    git

# add canvas dependences
RUN apk add --no-cache \
    python \
    g++ \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    && npm install canvas@2.6.1

# install app dependencies
COPY package.json /
COPY . /

RUN cd / && npm install

CMD [ "node", "index.js" ]