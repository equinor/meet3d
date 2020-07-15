FROM node:14-alpine

WORKDIR /project
COPY . /project

RUN ls -la

RUN npm install

EXPOSE 3000
CMD ["node", "signal.js"]
