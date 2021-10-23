FROM node:latest
WORKDIR /usr/src/cubemoji

# setup any requisite packages
COPY setupImage.sh .
RUN ./setupImage.sh

COPY package.json .
COPY secrets.json .
COPY run-watch.sh .
COPY src/ .


RUN npm install

CMD npm start 2>&1 | ./run-watch.sh
