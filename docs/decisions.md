# Architecture Decision Records (ADRs)

This document records the **why** behind PG Manager's major technical choices — the tradeoffs considered and the reasoning, not just the outcome. Each record is dated and has a status.

> Format: each ADR states the **context**, the **options** weighed, the **decision**, and the **consequences** (including what we give up).

---

## ADR-001 — Firebase (Firestore + Auth + Storage) as the backend, over a custom server + SQL stack

**Status:** Accepted · **Date:** 2026-07-22

### Context
PG Manager is a solo-built tool for small property owners. It needs authentication, a database, and file storage — but not heavy custom business logic. The priority is shipping a correct, private, low-maintenance app, not running infrastructure.

### Options
- **Firebase** — managed Auth, Firestore, and Storage; client SDK talks directly to the backend; security enforced by rules.
- **Custom backend (Node/Express + PostgreSQL + S3)** — full control, but every concern (auth, storage, hosting, migrations, ops) is hand-built and self-run.

### Decision
**Firebase.** Auth, Cloud Firestore, and Storage, accessed from the Next.js client via the Firebase SDK.

### Reasoning
- **Zero servers to run.** For a single maintainer, managed Auth + DB + Storage removes the entire ops burden — no server, no connection pooling, no separate deploy target.
- **The three needs are exactly Firebase's core.** Auth (with Google + email/password out of the box), a real-time document DB, and file storage are precisely what this app requires, with one SDK and one console.
- **Security rules give a real trust boundary** without a middle tier — see ADR-002.
- **Cost fits the user.** Usage-based pricing keeps a small operator in the low tiers.

### Consequences
- The browser talks to the database directly, so **all** access control lives in security rules; a mistake there is a real exposure. We mitigate by scoping every document with `ownerId` and testing rules (ADR-002).
- Vendor lock-in to Firebase. Acceptable for the scope; the data-access code is isolated in a `services/` layer, so a future migration is localized.
- Firebase Storage requires the pay-as-you-go **Blaze** plan to enable. Documented in setup; the free quota is generous for a small property.

---

## ADR-002 — Security rules as the backend; per-owner isolation via `ownerId`

**Status:** Accepted · **Date:** 2026-07-22

### Context
Because the client talks straight to Firestore/Storage (ADR-001), there is no server layer to check "does this owner own this record?". Multiple independent PG owners will use the same database, and one owner must never see or modify another's tenants, payments, or documents. The stakes include Aadhaar PII.

### Options
- **Trust the client** — filter by owner in the UI only. Simple, and completely insecure: anyone can query the raw database.
- **Security rules enforce ownership** — every document carries `ownerId`, and rules reject any read/write where `ownerId != request.auth.uid`.

### Decision
**Security rules enforce ownership.** Every domain document (`rooms`, `tenants`, `payments`) stores `ownerId`. Firestore rules require `request.auth != null` and `ownerId == request.auth.uid` for reads and writes; Storage rules require the owner path segment to equal `auth.uid`.

### Reasoning
- **The client is untrusted by definition.** A query filter is a UX convenience, not a security control. The database must enforce isolation itself.
- **`ownerId` on every document** makes the rule trivial, uniform, and auditable — the same predicate protects every collection.
- **Rules live in the repo** (`firestore.rules`, `storage.rules`), so the trust boundary is versioned and reviewable like code.

### Consequences
- Every write must set `ownerId` correctly, and every query must filter by it. This discipline is centralized in the `services/` layer so it can't be forgotten per-page.
- Composite indexes may be needed for owner-scoped queries; Firebase surfaces these on demand.

---

## ADR-003 — Payments as an append-only ledger, not a boolean "paid" flag

**Status:** Accepted · **Date:** 2026-07-22

### Context
The original MVP effectively answered only "is this tenant paid this month?" Owners actually need history: what was paid, for which month, and when — the things they argue about with tenants and reconcile at month-end.

### Options
- **Boolean flag on the tenant** — `paid: true/false`. Trivial, but destroys history and can't represent past months or corrections.
- **Payment ledger** — a `payments` collection where each payment is its own document (`tenantId`, `month`, `year`, `amount`, `paidDate`).

### Decision
**Payment ledger.** Each payment is an immutable-ish record. A tenant's status for a given month is **derived** by checking whether a payment exists for that month/year.

### Reasoning
- **History is the product.** A ledger answers "show me this tenant's payments" and future monthly reports — a boolean can't.
- **Derived status is always correct.** Paid/Pending/Overdue is computed from the ledger + due date, so there's no flag to fall out of sync.
- **Corrections are explicit.** A mistaken payment is removed by deleting that record, leaving a clear trail.

### Consequences
- Computing status means reading payments and matching by month/year in the client — fine at a small property's scale; a future optimization is a monthly index or aggregate.
- We deliberately defer **partial payments and deposits** (a payment is currently full-month). The ledger shape leaves room to add them without a redesign.

---

## ADR-004 — Rooms as first-class documents with derived occupancy

**Status:** Accepted · **Date:** 2026-07-22

### Context
Originally a tenant's room was just a free-text string. Owners think in rooms and beds — "Room 3 has 4 beds, one is free" — and need to see vacancy and avoid over-filling a room.

### Options
- **Free-text room on the tenant** — no capacity, no vacancy, typos create phantom rooms.
- **Rooms collection** — each room a document with `roomNumber` and `capacity`; tenants reference a `roomId`; occupancy is derived by counting active tenants.

### Decision
**Rooms collection.** A room has a bed `capacity`. Occupancy and vacancy are **derived** from the count of active tenants assigned to the room; adding a tenant is blocked when the room is full.

### Reasoning
- **Matches the owner's mental model** — rooms and beds, with real vacancy numbers on the dashboard.
- **Derived occupancy can't drift.** Counting active tenants is always accurate, versus a stored counter that must be kept in sync on every add/leave/move.
- **Capacity enables a real rule** — the app can refuse to overfill a room.

### Consequences
- Occupancy requires reading tenants per room; cheap at this scale. Existing free-text rooms are migrated to `roomNumber` on rooms as owners set them up.

---

## ADR-005 — Firebase Storage with per-owner rules for ID documents, over a public folder

**Status:** Accepted · **Date:** 2026-07-22 · **Supersedes:** the original `public/uploads` upload route

### Context
The first version uploaded Aadhaar/ID files into the Next.js `public/uploads/` folder and stored a public path. Those files were served at **guessable, unauthenticated URLs** and, on a serverless host like Vercel, wouldn't even persist (read-only/ephemeral filesystem). Aadhaar is sensitive PII — this was the most serious issue in the app.

### Options
- **Keep `public/` uploads** — simple, but public and non-persistent; unacceptable for PII.
- **Firebase Storage + rules** — upload to an owner-scoped path; only the owning account can read; nothing public.
- **Base64 in Firestore** — stays on the free plan, but bloats documents and is awkward for PDFs.

### Decision
**Firebase Storage.** Documents are stored at `owners/{uid}/tenants/{tenantId}/{file}`. The tenant document stores only the **storage path**, not a public URL. A download URL is fetched on demand while authenticated, and Storage rules require the path's owner segment to equal `auth.uid`.

### Reasoning
- **PII must not be publicly reachable.** Owner-scoped Storage + rules makes documents private by construction.
- **Persistence.** Object storage survives deploys, unlike a serverless filesystem.
- **Consistency.** The same `ownerId == auth.uid` principle as the database (ADR-002) now covers files too.

### Consequences
- Firebase Storage requires the **Blaze** plan; noted in setup. The free tier of Blaze covers a small property comfortably.
- Viewing a document is a quick authenticated fetch rather than a static link — a deliberate privacy trade.

---

## ADR-006 — Client-side route protection, over Next.js middleware/`proxy`

**Status:** Accepted · **Date:** 2026-07-22

### Context
Unauthenticated users must be kept out of the app's pages. Next.js 16 deprecates the `middleware` convention in favor of `proxy`, and Firebase Auth sessions are held **client-side** by the Firebase SDK.

### Options
- **Server middleware / `proxy`** — intercept requests at the edge, but it can't see the client-held Firebase session without extra token plumbing (session cookies, admin SDK).
- **Client-side guard** — an `AuthProvider` exposes the current user; an `AuthGuard` redirects to `/login` when there's no session.

### Decision
**Client-side guard.** The auth context is the source of truth for the session; guarded routes render only for an authenticated owner and redirect otherwise.

### Reasoning
- **The session already lives in the client.** Guarding where the token is avoids re-plumbing it to the edge just to make a redirect decision.
- **The real protection is the rules, not the redirect.** Even without any route guard, security rules deny data access to unauthenticated or wrong-owner requests (ADR-002). The guard is UX; rules are security.
- Sidesteps the deprecated `middleware` → `proxy` migration for a concern that doesn't need the server.

### Consequences
- Guarded pages are client components and briefly render a loading state while the session resolves. Acceptable and standard for Firebase client apps.

---

## ADR-007 — Offer both email/password and Google sign-in

**Status:** Accepted · **Date:** 2026-07-22

### Context
PG owners vary: some prefer a plain email/password login they can share with a co-manager; others want one-tap Google. We want low friction without forcing a Google account.

### Decision
Enable **both** Firebase Auth providers: email/password and Google.

### Reasoning
- **Meets owners where they are.** Google is one tap for those who want it; email/password serves those who don't use Google or want a shared property login.
- **Both are first-class in Firebase Auth** with almost no extra code, and both resolve to the same `auth.uid` that scopes data — so the rest of the app doesn't care which was used.

### Consequences
- Slightly more auth UI and two flows to test. Minor, and worth the reach.

---

## ADR-008 — Next.js + React + Tailwind for the frontend

**Status:** Accepted · **Date:** 2026-07-22

### Context
We need a fast, responsive, mobile-first app with a good deploy story, built by one person.

### Decision
**Next.js 16 (App Router) + React 19 + Tailwind CSS v4.**

### Reasoning
- Next.js gives routing, a great Vercel deploy story, and a mature ecosystem with minimal setup.
- Tailwind makes a consistent, mobile-first UI fast to build and easy to keep coherent.
- The app is inherently interactive and per-owner, so client components are the natural default; the Firebase client SDK pairs cleanly with them.

### Consequences
- Tailwind verbosity in markup, mitigated by small shared components. The app is largely client-rendered, which suits a personalized dashboard.

---

## Superseded / revisited decisions

- The original **`public/uploads` file route** for ID documents is superseded by **ADR-005** (Firebase Storage). It is kept in history as the starting point that motivated the privacy fix.
