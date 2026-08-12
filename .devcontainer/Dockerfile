FROM node:20-alpine

RUN apk add --no-cache git bash mariadb-client && npm install -g opencode-ai

WORKDIR /workspace

COPY package.json package-lock.json ./

RUN npm ci && npm cache clean --force

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
