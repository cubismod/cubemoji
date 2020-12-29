ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

RUN apk add --no-cache \
    nodejs \
    npm \
    git

# install app dependencies
COPY package.json /
COPY . /

RUN cd / && npm install

CMD [ "node", "index.js" ]