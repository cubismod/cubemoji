FROM node:17.4-alpine
WORKDIR /usr/src/cubemoji

ENV TZ=America/New_York

# setup any requisite packages
COPY scripts/ ./scripts/
RUN scripts/setup-image.sh

ENV CMG_DEST=/usr/src/cubemoji/static/emotes
RUN ["python3", "scripts/gen-images/gen.py"]

COPY package-lock.json .
COPY package.json .
COPY tsconfig.json .
COPY assets/ ./assets/
COPY src/ ./src/

RUN npm install --production
RUN npm install -g typescript 
RUN npm run build

CMD node --es-module-specifier-resolution=node build/Main.js