FROM node:22-alpine

RUN apk add --no-cache \
    git \
    bash \
    postgresql-client
    
WORKDIR /workspace

COPY package.json package-lock.json ./

RUN npm ci && npm cache clean --force

COPY . .

# Prisma requires DATABASE_URL while loading prisma.config.ts.
# Generate the client after the container starts, when the Compose
# service environment (including DATABASE_URL) is available.

EXPOSE 3000

# Do NOT start Express automatically.
# Keep the development container running.
CMD ["sleep", "infinity"]
