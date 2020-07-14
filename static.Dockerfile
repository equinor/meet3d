FROM node:14-alpine

WORKDIR /project
COPY . /project

RUN ls -la

RUN npm install

EXPOSE 8080
CMD ["node", "server.js"]
