FROM node:22-alpine

RUN apk add --no-cache \
    git \
    bash \
    postgresql-client

WORKDIR /workspace

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package manifests before installing
COPY apps/api/package.json apps/api/package.json
COPY apps/cadenza-client/package.json apps/cadenza-client/package.json
COPY apps/cadenza-mobile/package.json apps/cadenza-mobile/package.json
COPY apps/cadenza-web/package.json apps/cadenza-web/package.json

RUN npm ci

# Copy the rest of the project
COPY . .

EXPOSE 3000 5173

CMD ["sleep", "infinity"]