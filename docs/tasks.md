# SnapKiosk Web implementation plan

## Phase 1 — Foundation

- [x] Inspect the local repository and preserve configured origin.
- [x] Write requirements, design, and task specifications before implementation.
- [x] Set up npm workspaces for admin, gallery, and API.
- [x] Add D1 schema/migrations, local Cloudflare D1 and private R2 bindings.
- [x] Build responsive admin and separate guest/client gallery applications.
- [x] Add PBKDF2 password hashing, expiring hashed sessions, one-time owner setup, login throttling, and owner-managed accounts.
- [x] Connect dashboard counts to persisted database values.
- [x] Add an interactive owner setup CLI.
- [ ] Install a clean dependency tree and complete lint/build verification.

## Phase 2 — Events and rentals

- [x] Client and rental package create/read/update/archive workflows.
- [x] Booking lifecycle, manual payments, balance calculations, and overlapping client reservation protection.
- [x] Event lifecycle and legal transitions, event calendar list, and event CRUD/deletion requests.
- [x] Device assignment windows with database-enforced overlap prevention.
- [x] Audit business mutations and enforce server-side role restrictions.

## Phase 3 — Multi-device management

- [x] High-entropy pairing request, approval, completion, one-time credentials, rotation, and revocation.
- [x] Device heartbeat and monitoring, command queue and acknowledgement.
- [x] Versioned event configuration publish and rollback.
- [x] Device-to-event assignment windows and role-scoped event staff.
- [ ] Confirm pairing and delayed synchronization with the separate SnapKiosk mobile repository and physical devices.

## Phase 4 — Digital delivery

- [x] Private R2 upload authorization with one-time tokens, exact size and SHA-256 verification, idempotency, and retry token renewal.
- [x] Offline session recovery using the kiosk-generated original guest QR token.
- [x] Capture, individual-delivery, and separate client-gallery consent records.
- [x] Hashed guest token issuance, protected downloads, upload monitor, and separate client albums.
- [ ] Exercise offline retries and storage-failure recovery with real kiosk uploads in staging.

## Phase 5 — Expiration and client galleries

- [x] 7/15/30-day guest and client access policies, extensions, and revocation.
- [x] Client album access is event-wide but includes only separately consented sessions.
- [x] Retention-aware scheduled cleanup and cleanup history, with active link protection.
- [x] Exact boundary check: access expires when `expiresAt <= now`.
- [ ] Verify scheduled deletion and exact expiry behavior against a staging R2 bucket.

## Phase 6 — Design studio

- [x] Built-in template fixtures and a shared versioned template schema.
- [x] Drag/move layout editor, element inspector, text/photo placeholders, and saved template versions.
- [x] Private business/event asset library for logos, backgrounds, graphics, and fonts.
- [x] Add image asset placement and full-color PNG preview export to the template editor.
- [ ] Compare generated layouts with the mobile print renderer and physical printer output.

## Phase 7 — Exports and reports

- [x] Google Drive OAuth flow, encrypted stored tokens, refresh, asynchronous event exports, and consent filtering.
- [x] Storage, upload, device, and cleanup monitoring.
- [x] CSV exports for bookings/payments, events, devices, and uploads.
- [x] Admin audit log UI.
- [ ] Connect and validate a Google test account and confirm export cancellation/reconnection behavior.

## Phase 8 — Release readiness

- [x] Expand mobile integration docs and OpenAPI contracts for implemented endpoints.
- [x] Add privacy notice, account/event deletion requests, and owner-reviewed deletion processing.
- [x] Add PWA manifest, icon, install behavior, and safe shell caching that excludes API responses.
- [x] Add independent deployment instructions and production secret/resource requirements.
- [ ] Add and run security, performance, and integration coverage.
- [ ] Complete real mobile pairing, delayed upload, printer-offline, expiry, cleanup, and multi-event isolation checks in staging.
- [ ] Configure production Cloudflare D1/R2, domains, secrets, and Google OAuth credentials.

## Status

All planned application/API feature areas now have implementation paths and admin screens. This is not a production release until clean dependency/build checks, automated coverage, real mobile/kiosk staging checks, and owner-provided production services and credentials are completed. Google Drive export and R2 delivery require configured secrets/resources. The app cannot validate printer behavior or offline mobile recovery without the separate mobile app and physical test devices.
