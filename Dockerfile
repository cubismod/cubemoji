FROM node:14
WORKDIR /usr/src/app

# setup any requisite packages
COPY setupImage.sh .
RUN ./setupImage.sh

COPY package.json .

RUN npm install
COPY ./src .

CMD npm start 2>&1 | ./run-watch.sh
