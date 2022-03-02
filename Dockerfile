FROM node:17.4-bullseye
WORKDIR /usr/src/cubemoji

ENV TZ=America/New_York

# setup any requisite packages
COPY scripts/setup-image.sh .
RUN ./setup-image.sh

COPY package-lock.json .
COPY package.json .
COPY tsconfig.json .
COPY assets/ ./assets/
COPY src/ ./src/

RUN npm install --production
RUN npm install -g typescript 
RUN npm run build

ENV CMG_DEST=/usr/src/cubemoji/static/emotes
RUN scripts/gen-images/gen.py

CMD node build/src/Main.js