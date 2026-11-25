# Independent deployment

The admin app, public gallery, and API deploy as separate services. The root Compose stack is for local development only.

## Build the browser applications

Set the API base URL to the deployed Worker URL before each build. It must include `/api/v1`.

```sh
VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build -w @snapkiosk/admin
VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build -w @snapkiosk/gallery
```

Deploy `apps/admin/dist` and `apps/gallery/dist` as separate static sites. Configure both hosts to serve `index.html` for SPA paths, and include `privacy.html`, the manifest, icon, and service worker from the admin build. Set the matching production origins in the Worker environment. The admin and gallery builds contain only public API URLs; never put OAuth secrets, session keys, setup tokens, or storage credentials in Vite variables.

## Configure the API

Create production D1 and private R2 resources in Cloudflare, then update the Worker bindings in `backend/wrangler.toml` with the actual database and bucket names/IDs. Do not deploy the local placeholder D1 ID or use production data in the local database. Apply D1 migrations before enabling the sites.

Set these Worker secrets:

- `SETUP_TOKEN` — random, one-time initial owner setup token.
- `TOKEN_ENCRYPTION_KEY` — base64 encoding of 32 random bytes, used to encrypt Google Drive OAuth tokens at rest.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` — Google OAuth client and callback configuration.

Set `APP_ENV=production`, `ADMIN_ORIGIN`, and `GALLERY_ORIGIN` in Worker variables. Use HTTPS origins, configure Cloudflare HTTPS, and set the exact URLs in the Google OAuth consent configuration. Create the first owner once, then rotate/remove the setup token. Never expose the service credentials in browser code or logs.

## Operational checks before launch

- Apply every migration and confirm the Worker health endpoint responds.
- Create and sign in as the owner; create a separate administrator and event-staff account.
- Confirm administrator pages reject unauthenticated requests and owner-only user/deletion endpoints reject other roles.
- Pair a real kiosk, rotate and revoke its credential, assign it to an event, and verify heartbeat/configuration/command acknowledgement.
- With the separate mobile repository, exercise an offline capture and delayed upload using the same guest QR token, checksum rejection, consent denial, retry idempotency, and printer-unavailable behavior.
- Upload real sample photos to private R2; confirm unauthenticated object URLs are not public and authorized gallery URLs stop working at the exact expiry boundary.
- Verify event deletion and retention cleanup remove R2 objects while preserving the cleanup log.
- Connect a test Google Drive account and export a consented event album; verify cancellation, token revocation, and re-connection.
- Check mobile/tablet admin layouts, keyboard-only access, photo upload size limits, rate limiting, backups, and recovery.

The code repository cannot supply production account credentials or a physical kiosk. Complete these checks in staging with the studio owner and mobile app before describing the service as production-ready.
