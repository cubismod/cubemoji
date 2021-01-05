ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

RUN apk add \
    nodejs \
    npm \
    git

# canvas dependences
RUN apk add \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# install app dependencies
WORKDIR /cubemoji
COPY package.json package-lock.json /cubemoji/
RUN npm ci
COPY . /cubemoji

CMD ["npm", "run", "start" ]