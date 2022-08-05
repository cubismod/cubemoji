FROM quay.io/cubismod/cubemoji-base:latest
WORKDIR /usr/src/cubemoji

EXPOSE 7923

COPY assets/ ./assets/

COPY yarn.lock .
COPY package.json .

RUN corepack enable && yarn install --production=true

COPY tsconfig.json .
COPY .eslintrc.json .
COPY src/ ./src/
COPY PRIVACY.md .

RUN yarn build

CMD ["yarn", "start"]
