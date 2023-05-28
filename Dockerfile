FROM node:14-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src /app/src

RUN npm ci
RUN npm run build

CMD [ "node", "./dist/index.js" ]
