FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests before npm ci so npm installs workspace dependencies.
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/obo-web/package*.json ./apps/obo-web/

RUN npm ci

ENV NODE_ENV=production
# Prisma config requires DATABASE_URL during generation. Generation does not connect to the database.
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

COPY apps/api ./apps/api
COPY eslint.config.mjs ./

RUN npm --workspace @express-app/api run prisma:generate
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api ./apps/api
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "apps/api/src/server.js"]
