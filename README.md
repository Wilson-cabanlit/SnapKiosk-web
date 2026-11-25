# SnapKiosk Web

SnapKiosk Web is the separate management, gallery, and API repository for the SnapKiosk rental photo booth ecosystem. The React Native kiosk remains in the independent `snapkiosk-mobile` repository.

## Repository layout

- `apps/admin` — React/Vite responsive studio dashboard.
- `apps/gallery` — separate mobile-first guest gallery client.
- `backend` — Hono API for Cloudflare Workers, D1 metadata, and private R2 binding.
- `docs` — product requirements, design, task plan, API contract, and mobile integration notes.

## Local setup

Requirements: Node.js 20.19+ and npm 10+.

```sh
npm install
npm run db:migrate
npm run seed:templates
npm run dev
```

This starts admin at `http://localhost:5173`, guest gallery at `http://localhost:5174`, and the API at `http://localhost:8787`. Applications build independently with `npm run build -w @snapkiosk/admin`, `npm run build -w @snapkiosk/gallery`, and `npm run build -w @snapkiosk/api`.

## Run with Docker

Docker Compose is configured for local development. Install Docker Desktop, then run:

```sh
cp -n .env.example .env
cp -n backend/.dev.vars.example backend/.dev.vars
# Set SETUP_TOKEN in backend/.dev.vars to a fresh value, for example: openssl rand -hex 32
docker compose up --build
```

After the containers are running, seed the built-in Free Templates collection once:

```sh
docker compose exec api npm run seed:templates -w @snapkiosk/api
```

When upgrading an existing Docker database, apply newly added migrations before seeding:

```sh
docker compose run --rm migrate
docker compose exec api npm run seed:templates -w @snapkiosk/api
```

The catalog seed installs 72 stable-ID templates (216 color/thermal layout records), including 24 landscape master designs. Re-running the seed adds new built-ins and preserves administrator-created templates and published version history. For a production D1 database, apply migrations and run `npm run seed:templates -w @snapkiosk/api -- --remote` from a configured deployment environment.

Open the same three addresses listed above. Compose runs the local D1 migration before starting Wrangler, persists Wrangler's local D1/R2 state in the `wrangler_state` volume, and keeps installed npm packages in the `node_modules_debian` volume. Source changes are mounted for hot reload.

Stop the services with `docker compose down`; this keeps local data. To remove the containers and erase the local database and dependency volumes, run `docker compose down -v`. The Compose file is for development only. Production continues to use independently deployed Cloudflare applications and Worker resources.

### If the API is not running

The API starts after the `migrate` service completes. Wrangler launches `workerd` for local D1/R2, so the development image uses Debian (glibc) with `libc++1`; Alpine images may fail to start that native runtime. Check both services and read their recent logs:

```sh
docker compose ps -a
docker compose logs --tail=100 migrate api
```

Rebuild the development image after Dockerfile changes, then start the stack:

```sh
docker compose up --build
```

When the API is ready, `http://localhost:8787/api/v1/health` should return `{"data":{"status":"ok"}}`. The admin and gallery use this API address from the host browser.

Root `.env` files are for public URLs only; copy `.env.example` as needed. Wrangler manages local D1/R2 state in its ignored local directory and Compose keeps it in the `wrangler_state` volume. Set a new private `SETUP_TOKEN` in `backend/.dev.vars`, restart the API, then create the first owner interactively with `npm run setup-owner`. This sends the token to the one-time `POST /api/v1/auth/setup-owner` endpoint without placing it in frontend variables. The token must remain backend-only and must never be committed.

For local Google Drive export support, add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=http://localhost:8787/api/v1/integrations/google-drive/callback`, and a base64-encoded 32-byte `TOKEN_ENCRYPTION_KEY` to `backend/.dev.vars`. Register the same redirect URI in Google Cloud OAuth settings. Generate the encryption key with `openssl rand -base64 32`. Production must set each value as a Worker secret (`npx wrangler secret put SECRET_NAME` from `backend/`) and configure the matching callback URL. The encryption key protects Drive refresh and access tokens stored in D1.

## Current implementation status

The repository includes studio authentication and roles, rental operations, event lifecycle and assignment windows, device pairing and monitoring APIs, offline session registration, private checksum-verified R2 uploads, guest and client galleries, consent, expiry and cleanup, a drag layout editor with private image assets and PNG preview export, CSV reports, audit history, Google Drive OAuth/export, privacy requests, and an installable admin shell. See [`docs/tasks.md`](docs/tasks.md) for implementation and external validation status. Google OAuth requires owner-provided credentials; mobile pairing, delayed upload, printer-offline handling, production deployment, and real-device behavior still require integration with the separate mobile app and configured Cloudflare/Google accounts.

Read [`docs/requirements.md`](docs/requirements.md), [`docs/design.md`](docs/design.md), [`docs/mobile-integration.md`](docs/mobile-integration.md), and [`docs/deployment.md`](docs/deployment.md) before extending or deploying the system.

## Security notes

- Do not commit credentials, D1 production state, customer photos, local uploads, or generated archives.
- R2 is private; only the API may authorize access.
- Production must configure HTTPS origins, secure cookies, Worker secrets, production D1/R2 resources, and restricted CORS.
- Do not expose real guest tokens or customer photos in logs or analytics.

## Git

The configured remote is `origin`. Do not push or force-push without the user's explicit approval. The current local checkout was empty when work began and GitHub could not be reached from this environment, so its remote contents and history could not be compared.
