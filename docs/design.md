# SnapKiosk Web Design and Technical Decisions

## Repository and runtime

One npm workspace repository contains three independently buildable applications: Vite/React admin and gallery frontends, plus a Hono Cloudflare Worker API. JavaScript and JSX are used throughout. D1 migrations define relational constraints and indexes; R2 holds private photo objects. No generated or private photo assets belong in Git.

## Trust boundaries

```text
Admin browser ── session cookie ──┐
                                 ├── Hono API ── D1 metadata
Guest browser ── guest token ────┤             └─ R2 private objects
Kiosk app ── device credential ──┘
```

The API is authoritative for roles, device assignment windows, event configuration versions, consent, token state, expiry, and cleanup eligibility. Browsers do not receive database credentials or bucket-wide access. The gallery must request only authorized metadata and short-lived object access.

## Session and token design

Admin session identifiers are high entropy, held in `HttpOnly` cookies, stored as SHA-256 hashes in D1, and expire server-side. Passwords use PBKDF2-SHA-256 with random salts. Guest tokens and device credentials are also generated with cryptographic randomness and stored as hashes. Production cookies require `Secure`; CORS permits only configured admin/gallery origins. Device pairing codes are short-lived approval challenges and never become permanent credentials.

## Time, assignments, and retention

Persist timestamps in UTC and keep the event IANA time zone for display. Device assignment windows preserve old event ownership for delayed offline sessions. Expiration and retention are separate fields; cleanup derives eligibility from all remaining access grants and uses idempotent jobs with auditable outcomes.

## Template contract

Templates are versioned, resolution-independent JSON. Element positions use normalized canvas coordinates, each photo slot maps to a captured photo index, and output dimensions/margins are explicit. A future shared fixture suite will define crop, font, rotation, layer and QR safe-area behavior for the web editor and mobile renderer.

## Frontend behavior

Admin uses React Router, TanStack Query, React Hook Form, Zod, Lucide, and Recharts as feature screens are added. The initial layout uses warm neutral surfaces, restrained green accents, compact data cards, responsive sidebar navigation, clear loading/error/empty states, and real API-backed counts. Gallery is separate so guest routes never inherit admin UI/session assumptions.

## Deployment boundaries

Each app has its own build. Public Vite variables may contain only URLs and non-secret flags. Workers secrets configure setup, session, OAuth, and provider credentials. Local D1/R2 emulation is distinct from production resources; deployment instructions must make the environment explicit.

## Risks to close before production

- Implement full per-role and event-level authorization on every API route.
- Add robust device credential issuance/rotation and authenticated pairing.
- Complete upload integrity checks and R2 access mediation.
- Add durable asynchronous album export and cleanup job retry semantics.
- Verify cross-origin cookie behavior, rate limits, CSP, abuse limits, and file upload boundaries in deployed environments.
- Complete Philippine privacy notice/consent/deletion workflow and operational recovery plan.
