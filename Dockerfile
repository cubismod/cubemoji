FROM node:17.4-bullseye
WORKDIR /usr/src/cubemoji

# setup any requisite packages
COPY setup-image.sh .
RUN ./setup-image.sh

COPY package-lock.json .
COPY package.json .
COPY secrets.json .
COPY tsconfig.json .
COPY assets/ ./assets/
COPY src/ ./src/
COPY .env .
COPY serviceKey.json .

RUN npm install --production
RUN npm install -g typescript 
RUN npm run build

CMD node build/src/Main.js