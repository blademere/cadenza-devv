FROM node:22-alpine

RUN apk add --no-cache \
    git \
    bash \
    postgresql-client

RUN npm install -g @gitlawb/openclaude@latest

WORKDIR /workspace

COPY package.json package-lock.json ./

RUN npm ci && npm cache clean --force

COPY . .

RUN npx prisma generate

EXPOSE 3000

# Do NOT start Express automatically.
# Keep the development container running.
CMD ["sleep", "infinity"]