FROM node:22-alpine

RUN apk add --no-cache \
    git \
    bash \
    curl \
    ca-certificates \
    tar \
    postgresql-client

# Install the official ngrok agent for local webhook development.
RUN set -eux; \
    arch="$(apk --print-arch)"; \
    case "$arch" in \
      x86_64) ngrok_arch="amd64" ;; \
      aarch64) ngrok_arch="arm64" ;; \
      armv7) ngrok_arch="arm" ;; \
      *) echo "Unsupported ngrok architecture: $arch" >&2; exit 1 ;; \
    esac; \
    curl -fsSL "https://bin.ngrok.com/c/bNyj1mQV4Yc/ngrok-v3-stable-linux-${ngrok_arch}.tgz" -o /tmp/ngrok.tgz; \
    tar -xzf /tmp/ngrok.tgz -C /usr/local/bin; \
    rm /tmp/ngrok.tgz; \
    ngrok version

WORKDIR /workspace

COPY package.json package-lock.json ./

RUN npm ci && npm cache clean --force

COPY . .

# Prisma requires DATABASE_URL while loading prisma.config.ts.
# Generate the client after the container starts, when the Compose
# service environment (including DATABASE_URL) is available.

EXPOSE 3000 5173

# Do NOT start Express automatically.
# Keep the development container running.
CMD ["sleep", "infinity"]
