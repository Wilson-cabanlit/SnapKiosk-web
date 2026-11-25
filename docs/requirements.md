# SnapKiosk Web Requirements

## Product scope

SnapKiosk Web is the separate web repository for a rental operations manager, private guest galleries, and the API used by the existing React Native kiosk app. Mobile capture and local printing must continue to work offline and remain in `snapkiosk-mobile`.

## Users and access

- **Owner:** full access, studio settings, administrators, storage providers, events, rentals, and devices.
- **Administrator:** events, clients, bookings, packages, templates, devices, and galleries.
- **Event staff:** assigned events and devices only, with upload monitoring and authorized troubleshooting.
- Public administrator registration is disabled. The first owner must be created through a one-time protected setup flow.
- Every authorization rule is enforced by the API. Browser route protection is only a usability layer.

## Core records

Clients, rental packages, bookings and payments, events, device assignment periods, devices and credentials, versioned event configurations, templates and versions, assets, photo sessions and consents, guest/client access, uploads and print jobs, exports, cleanup jobs, and audit entries.

## Business rules

- Currency defaults to PHP; business time zone defaults to `Asia/Manila`.
- Guest access supports 7, 15, or 30 days and defaults to 7 days. Client access defaults to 30 days. A session's expiry is based on event end time and stored in UTC.
- Guest QR links remain stable when access is extended. The QR code is a pointer; the API controls access.
- Guest access never grants access to the full client album. Client gallery consent is recorded separately.
- A kiosk may serve different events at different times. Assignment windows cannot overlap. Late uploads stay tied to the event and assignment under which they were captured.
- Retention is separate from link expiry. Cleanup must respect every active authorized access period and extensions.
- Dashboard values come from persisted records. Missing data is represented as zero or an empty state, never invented operational activity.
- Originals and final compositions stay full color in private R2. Thermal print appearance is a preview approximation only.
- Customer photos are not sent to analytics; facial recognition is out of scope.

## Security and privacy

Use secure password hashing, expiring server-side sessions, hashed session and guest tokens at rest, role authorization, login rate limits, input validation, audit logging, private storage, short-lived download authorization, CORS allowlists, and production HTTPS. Store provider credentials only as backend secrets. Record capture, individual delivery, and client-album consent distinctly. Provide a Philippine business privacy notice and deletion workflow before production launch.

## Applications

- `apps/admin`: responsive, installable manager for desktop, tablet, and phone.
- `apps/gallery`: mobile-first public application that reveals only records authorized by an unguessable guest or client token.
- `backend`: Hono REST API on Cloudflare Workers, D1 relational metadata, private R2 objects, and scheduled retention jobs.
- Shared integration uses documented JSON contracts, not imports from the mobile repository.

## Acceptance criteria

The application and API now implement authenticated rental operations, event and device management, secure pairing and configuration sync, shared template contracts, offline-created sessions that become available at the same QR URL, guest and client galleries with independent expiration and consent, protected uploads/downloads, cleanup, monitoring, reports, Drive exports, and separate admin/gallery/API deployment guidance. Production acceptance remains conditional on clean build/security coverage, owner-provided Cloudflare and Google configuration, and successful staging checks against the separate mobile repository and physical kiosks; see `tasks.md` and `deployment.md`.
