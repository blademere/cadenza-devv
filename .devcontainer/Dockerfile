FROM node:22-alpine

RUN apk add --no-cache \
    git \
    bash \
    postgresql-client

WORKDIR /workspace

COPY package.json package-lock.json ./

COPY apps/api/package.json apps/api/package.json
COPY apps/cadenza-client/package.json apps/cadenza-client/package.json
COPY apps/cadenza-mobile/package.json apps/cadenza-mobile/package.json

RUN npm ci

COPY . .

EXPOSE 3000
EXPOSE 5173

CMD ["sleep", "infinity"]