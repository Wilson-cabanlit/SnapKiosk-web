FROM node:24-bookworm-slim

# Wrangler launches workerd for local D1/R2. Its Linux binary needs glibc and libc++.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libc++1 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Copy workspace manifests first so Docker can cache dependency installation.
COPY package.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/gallery/package.json ./apps/gallery/package.json
COPY backend/package.json ./backend/package.json

RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 5173 5174 8787

CMD ["npm", "run", "dev"]
