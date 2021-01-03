ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

RUN apk add --no-cache \
    nodejs \
    npm \
    git

# canvas dependences
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# install app dependencies
COPY package.json /
COPY . /

RUN cd / && npm install

CMD [ "node", "index.js" ]