FROM node:latest
WORKDIR /usr/src/cubemoji

# setup any requisite packages
COPY setup-image.sh .
RUN ./setup-image.sh


COPY package.json .
COPY secrets.json .
COPY run-watch.sh .
COPY tsconfig.json .
COPY assets/ ./assets/
COPY src/ ./src/
COPY .env .
COPY serviceKey.json .

RUN npm install --production
RUN npm install -g typescript 
RUN npm run build

RUN mkdir download

CMD node build/src/Main.js 2>&1 | ./pipe-to-webhook-ds