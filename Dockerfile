FROM node:15.8.0-alpine3.10

WORKDIR /usr/src/blitzinfo

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000
EXPOSE 5001

CMD node dist/app-main.js --unhandled-rejections=warn

