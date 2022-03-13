FROM node:17.4-alpine
WORKDIR /usr/src/cubemoji

ENV TZ=America/New_York

# setup any requisite packages
COPY scripts/ ./scripts/
RUN scripts/setup-image.sh

COPY assets/ ./assets/

ENV CMG_DEST=/usr/src/cubemoji/static
ENV CMG_FAV_SRC=/usr/src/cubemoji/assets/favicon
RUN ["python3", "scripts/gen-images/gen.py"]

COPY package-lock.json .
COPY package.json .
RUN npm install --production

COPY tsconfig.json .
COPY src/ ./src/

RUN npm install -g typescript 
RUN npm run build

CMD npm start