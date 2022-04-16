FROM node:17.8-alpine
WORKDIR /usr/src/cubemoji

# setup any requisite packages
COPY scripts/ ./scripts/
RUN scripts/imagemagick.sh
RUN scripts/setup-image.sh

COPY assets/ ./assets/

ENV TZ=America/New_York CMG_DEST=/usr/src/cubemoji/static CMG_FAV_SRC=/usr/src/cubemoji/assets/favicon
RUN ["python3", "scripts/gen-images/gen.py"]

COPY yarn.lock .
COPY package.json .

RUN corepack enable && yarn install --production=true

COPY tsconfig.json .
COPY src/ ./src/

RUN npm run build

CMD npm start