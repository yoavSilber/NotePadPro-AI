FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm install ts-node typescript

COPY . .

EXPOSE 3001

CMD ["npx", "ts-node", "server.ts"]
