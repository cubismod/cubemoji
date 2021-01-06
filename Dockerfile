ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

RUN apk add \
    nodejs \
    npm \
    git

# install app dependencies
WORKDIR /cubemoji
COPY package.json package-lock.json /cubemoji/
RUN npm ci
COPY . /cubemoji

CMD ["npm", "run", "start" ]