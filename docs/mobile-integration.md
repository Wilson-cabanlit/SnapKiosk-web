# Mobile and API integration contract

API base path: `/api/v1`. Local API: `http://localhost:8787/api/v1`. Send timestamps as ISO 8601 UTC; event responses include an IANA time zone. The production API origin is configured by the deployment owner.

All JSON responses use `{ "data": ... }` or `{ "error": { "code": "...", "message": "..." } }`. Do not log credentials, session cookies, upload tokens, guest/client gallery tokens, photo contents, or private URLs. Device credentials are opaque random bearer tokens and are returned only once.

## Admin authentication and owner access

| Method and path | Purpose |
| --- | --- |
| `POST /auth/setup-owner` | Create the first owner using backend-only `SETUP_TOKEN`; one time only. |
| `POST /auth/login` | `{email,password}`; returns user roles and sets an HttpOnly session cookie. |
| `POST /auth/logout` | Revoke the current session. |
| `GET /auth/me` | Read the current account or return `401`. |
| `GET /dashboard/summary` | Persisted kiosk, event, booking, and upload counts. |
| `GET /users`, `POST /users` | Owner-only account list and creation (`administrator` or `event_staff`). |
| `PATCH /users/{id}/status` | Owner-only account disable/enable; disabling revokes sessions. |

Owner setup requires a 12–128 character password. In local development, run `npm run setup-owner` after setting `SETUP_TOKEN` in `backend/.dev.vars` and starting the API. Production setup uses a separately configured Worker secret.

## Business operations

- `GET/POST /clients`, `PATCH/DELETE /clients/{id}` — client records.
- `GET/POST /packages`, `PATCH /packages/{id}` — PHP rental packages and 7/15/30-day guest/client defaults.
- `GET/POST /bookings`, `PATCH /bookings/{id}` — booking lifecycle and totals.
- `GET/POST /bookings/{id}/payments` — record and list manual payments; the API rejects payments above the remaining balance.
- `GET/POST /events`, `GET/PATCH /events/{id}` — event lifecycle. Legal transitions: draft → scheduled/cancelled; scheduled → active/cancelled; active → completed/cancelled; completed/cancelled → archived.
- `PUT /events/{id}/devices` — replace event device assignment windows; windows cannot overlap for the same device.
- `PUT /events/{id}/staff` — assign event-staff accounts.
- `PUT /events/{id}/delivery-settings` — guest/client validity, retention, originals, and event-wide client gallery policy. Client-gallery sharing is off until the owner enables it in Admin → Event Setup → Event delivery settings and saves the policy. Turning it off revokes active event album links. Each kiosk session still needs an individual `client_gallery` consent record before it can appear in a client album.
- `GET /audit-logs` — recent administrator mutation history.

Owner and administrator roles can perform business operations. Event staff can list/read assigned events only; browser visibility is not an authorization boundary.

## Kiosk pairing and synchronization

1. The kiosk generates a cryptographically random 32-byte pairing code (hex recommended) and submits `POST /devices/pairing-requests` with `{pairingCode,name,model,osVersion,appVersion}`. Pairing requests expire after 10 minutes.
2. An owner/administrator lists `GET /devices/pairing-requests` and approves with `POST /devices/pairing-requests/{id}/approve`.
3. The kiosk calls `POST /devices/pairing/complete` with the same `{pairingCode}`. The response returns `{deviceId,credential}` once. Store the credential in the platform’s secure storage.
4. Send `Authorization: Bearer <credential>` to `POST /devices/heartbeat`, `GET /devices/configuration`, `POST /devices/commands/poll`, and `POST /devices/commands/{id}/ack`.
5. Administrators can rotate/revoke credentials and queue supported commands (`refresh_configuration`, `capture_test`, `sync_now`, `clear_local_cache`). A revoked credential must stop working immediately.

Heartbeat body: `{batteryPercent,printerStatus,availableBytes,pendingUploads,appVersion,osVersion}`. Printer state is `connected`, `disconnected`, or `unknown`. Configuration responses contain the latest published version for the device’s current assignment window; an event publish or rollback creates a new monotonic version.

## Offline capture, consent, and upload

Before capture, the kiosk generates and stores its 32-byte guest token locally. Keep the original token and QR URL through offline retries. When connectivity returns, call `POST /device/sessions` with device authorization and:

```json
{
  "eventId": "event-id",
  "capturedAt": "2026-11-25T12:30:00.000Z",
  "idempotencyKey": "unique-device-capture-key",
  "guestToken": "original-random-guest-token",
  "clientGalleryEligible": false,
  "consents": [
    {"type":"capture_storage","granted":true,"source":"kiosk"},
    {"type":"individual_delivery","granted":true,"source":"kiosk"},
    {"type":"client_gallery","granted":false,"source":"kiosk"}
  ]
}
```

The server checks that the device was assigned to that event at `capturedAt`, requires capture-storage and individual-delivery consent, hashes the guest token at rest, and returns the same gallery URL on initial creation. Replaying the same device/idempotency key returns the existing session. Client album eligibility requires separate granted client-gallery consent and the event-wide option.

For each image, call `POST /device/sessions/{sessionId}/assets` with `{assetType,contentType,sizeBytes,sha256,idempotencyKey}`. Supported content types are JPEG, PNG, WebP, and GIF; max upload is 25 MiB per object. The response contains a short-lived upload token, URL, and required headers. Upload the raw bytes with `PUT /uploads/{uploadJobId}`, `X-Upload-Token`, the original `Content-Type`, and `X-Content-SHA256`. The API verifies exact size and SHA-256 before storing the image in private R2. GIF uploads are preserved byte-for-byte, so animated GIFs remain animated in the guest/client gallery and when downloaded. The kiosk must generate/render the desired animated GIF composition before upload; the web API does not turn a still image or print layout into an animation. If an upload token expires, repeat the asset-authorization request with the same idempotency key to obtain a new short-lived token. Never put the token in a URL or log it.

Keep the guest URL stable while offline; the same URL resolves to pending until all assets are verified, then displays the photo set. Retries must use the same session and upload idempotency keys. Do not block local capture or printing on API availability.

## Guest and client gallery

- Guest route: `{GALLERY_ORIGIN}/g/{guestToken}`.
- Client album route: `{GALLERY_ORIGIN}/c/{clientToken}`. Client tokens are separate from individual guest QR tokens and display only sessions with client-gallery consent.
- `GET /gallery/guest/{token}` and `GET /gallery/client/{token}` return `pending` or authorized metadata and photo asset URLs.
- The API validates link expiry/revocation for every image request; the R2 bucket must remain private.
- Owner/administrator can create event album links with `POST /events/{id}/client-gallery-access`, extend/revoke client links with `POST /client-gallery-access/{id}/extend` and `/revoke`, and extend/revoke guest links with `POST /sessions/{id}/extend` and `/revoke`.
- Guest periods support 7/15/30 days. Link expiry is checked at the exact boundary (`expiresAt <= now` is expired). Retention is separate and cleanup respects active authorized access periods.

## Templates, exports, reports, and deletion

- `GET/POST /templates`, `POST /templates/{id}/duplicate`, `POST/DELETE /templates/{id}/favorite`, `POST /templates/{id}/versions`, and publish/archive endpoints use the platform-independent `shared/template-schema` photo/text/shape schema. The 72 free definitions are in `free-templates.json`; 24 are landscape masters, and the catalog provides full-color and thermal output variants. Seed the local D1 catalog after migrations with `npm run seed:templates` (Docker: `docker compose exec api npm run seed:templates -w @snapkiosk/api`; production: `npm run seed:templates -w @snapkiosk/api -- --remote`). The seed uses stable IDs, adds newly introduced built-ins idempotently, and preserves administrator-created templates and published version history.
- Event assignment publishes a versioned event configuration with `configurationSchemaVersion: "1.0"`, `templateSchemaVersion: "1.0"`, `templateVersion`, `templateVersionId`, and the full `template` object. The template object uses the shared platform-independent schema (`template.schemaVersion`) and includes its `elements` plus `variants.color`, `variants.thermal58`, and `variants.thermal80` when available. A kiosk should reject unsupported schema versions with a visible sync failure, acknowledge the refresh command as failed, and retain its last known good configuration. The configuration API returns that JSON to the assigned kiosk; offline availability depends on the mobile app persisting the synchronized configuration locally.

Template orientation is derived from the master canvas `width` and `height`; `orientation` is included as a convenience field. `printSettings.printOrientation` supports `auto`, `original`, `rotate-clockwise`, and `rotate-counterclockwise`. Under `auto`, portrait masters remain portrait and landscape masters rotate clockwise for thermal printing. The mobile renderer must compose all layers first, rotate the complete raster, then scale uniformly to `printSettings.printableWidths.thermal58` or `.thermal80` (defaults 384 and 576 dots). Keep color/digital/GIF outputs in their original master orientation. The web preview simulates grayscale/monochrome and rotation; printer rasterization, QR scan quality, and hardware output still need verification in the mobile app.

Example template fields inside `data.configuration`:

```json
{
  "configurationSchemaVersion": "1.0",
  "templateSchemaVersion": "1.0",
  "templateId": "free-classic-blue-airline-boarding-pass",
  "templateVersionId": "free-classic-blue-airline-boarding-pass-v1",
  "templateVersion": 1,
  "template": {
    "schemaVersion": "1.0",
    "outputFormat": "ticket-6x4",
    "width": 1800,
    "height": 1200,
    "elements": [],
    "variants": {
      "color": {},
      "thermal58": {},
      "thermal80": {}
    }
  }
}
```

Republish an event through **Photo Templates → Assign to Event** to update configurations created before these explicit version fields were added.
- Dynamic field strings use `{{event.name}}`, `{{event.coupleNames}}`, `{{event.date}}`, `{{event.venue}}`, `{{event.startTime}}`, `{{event.reference}}`, `{{business.name}}`, and `{{session.captureDate}}`, `{{session.captureTime}}`, `{{session.qrCode}}`. The web preview can substitute event fields. The mobile renderer must substitute session/event tokens and render `session.qrCode` from the session's authorized `guestUrl` returned by the API; do not encode an arbitrary URL. The mobile repository is separate; verify its support before using QR, receipt, or GIF output on a kiosk. Catalog metadata leaves `minimumMobileAppVersion` unset until the mobile build is inspected and validated.
- Template metadata describes digital-copy, receipt, original-photo, thumbnail, and animated-GIF outputs. The web repo stores and synchronizes template definitions; it does not yet render the final printable/digital composition or animate captured photo frames. The mobile composition engine must render static layout layers and GIF output before claiming those outputs are production-ready.
- `POST /assets` accepts JPEG, PNG, GIF, WebP, WOFF2, and TTF multipart uploads (10 MiB max); animated GIF assets are retained as GIFs. `GET/DELETE /assets/{id}` uses private authenticated delivery/archive.
- Google Drive OAuth: navigate to `GET /integrations/google-drive/connect`; then create an asynchronous event export with `POST /integrations/google-drive/exports` and `{eventId}`. Exports include consented client-gallery images only. Status is available from `GET /integrations/google-drive/exports`. Google secrets and a base64 32-byte `TOKEN_ENCRYPTION_KEY` are required.
- CSV reports are available from `/reports/bookings.csv`, `/reports/events.csv`, `/reports/devices.csv`, and `/reports/uploads.csv`.
- `POST /privacy/deletion-request` submits an account, event, or studio request. An owner reviews it through `/privacy/deletion-requests`; approved event requests revoke links and queue photo cleanup before removing event records. Account requests anonymize/disable the user after approval. Studio-wide removal requires an owner-led verified backup and deployment-level cleanup.

## Error handling and retries

Retry connection failures and transient 5xx/429 responses with bounded exponential backoff and the same idempotency key. Do not retry validation, consent, assignment, invalid-token, revoked-token, or expiry failures without a state change. Keep local capture, print queues, and upload queues independent. A kiosk should report printer offline status, but continue allowing local capture and queuing prints for later.
