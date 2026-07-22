# PG Manager — System Architecture

**Status:** Draft v1 · **Last updated:** 2026-07-22

This document describes how PG Manager fits together. It reflects the intended design; sections marked _(planned)_ are not yet implemented. Rationale for the technology choices lives in [decisions.md](decisions.md); the concrete data shapes live in [data-model.md](data-model.md).

---

## 1. Design Principles

1. **Firebase-native & serverless.** There is no custom API server. The Next.js client talks directly to managed Firebase services. This keeps the surface small and the ops burden near zero — the right trade for a solo-built tool.
2. **Security rules are the backend.** Because the browser talks straight to the database, the trust boundary is the Firestore/Storage rule set. Every read and write is validated server-side against the signed-in owner. The client is treated as untrusted.
3. **Owner-scoped by construction.** Every domain document carries an `ownerId`. Queries filter by it and rules enforce it, so one owner can never see or touch another's data.
4. **Privacy-first for IDs.** Tenant Aadhaar/ID documents are PII. They live in private, per-owner Storage paths — never a public URL, never in source control.
5. **Mobile-first.** Owners run their property from a phone. The UI is responsive with a bottom nav on mobile and a sidebar on desktop.

---

## 2. System Overview

```mermaid
graph TB
    subgraph Client["Client Layer — Browser / Mobile"]
        WEB["Web App — Next.js 16 + React 19"]
        AUTHCTX["Auth Context + Route Guard"]
        SVC["Service Layer — tenants · payments · rooms · storage"]
    end

    subgraph Firebase["Firebase (managed backend)"]
        AUTH["Firebase Auth — email/password + Google"]
        FS[("Cloud Firestore — owners · rooms · tenants · payments")]
        ST["Firebase Storage — private ID documents"]
        RULES["Security Rules — ownerId == auth.uid"]
    end

    WEB --> AUTHCTX
    AUTHCTX --> AUTH
    WEB --> SVC
    SVC --> FS
    SVC --> ST
    RULES -. enforces .-> FS
    RULES -. enforces .-> ST
    AUTH -. provides uid .-> RULES
```

The client is thin but structured: an **auth context** owns the session and guards routes, and a **service layer** is the only place that touches Firestore/Storage. Firebase is the entire backend, with **security rules** as the enforcement layer sitting in front of the database and file storage.

---

## 3. Frontend

Next.js (App Router) + React + Tailwind. Client components throughout, because the app is inherently interactive and personalized to the signed-in owner.

```mermaid
graph TD
    ROOT["Root Layout — AuthProvider + nav shell"] --> GUARD["AuthGuard — redirect if signed out"]
    GUARD --> PAGES["Screens: Login · Signup · Dashboard · Tenants · Add Tenant · Rooms"]
    PAGES --> COMPS["Shared UI: Sidebar · MobileNav · StatCard · EditModal · LedgerView"]
    COMPS --> STATE["State: Auth context (user) · local component state"]
    STATE --> SVC["Service Layer"]
    SVC --> FB["→ Firebase SDK"]
```

Key decisions:
- **Client-side route protection.** The auth context exposes the current owner; an `AuthGuard` redirects unauthenticated users to `/login`. Next.js 16 deprecates `middleware` in favor of `proxy`, and Firebase Auth tokens live client-side, so guarding in the client is both simpler and correct here (see [decisions.md](decisions.md) ADR-006).
- **Service layer isolation.** UI never calls the Firebase SDK directly; it calls `services/*`, which inject the current `ownerId`. This keeps scoping consistent and swappable.

---

## 4. Authentication

Firebase Auth with two providers: email/password and Google. Sign-in establishes the owner identity (`auth.uid`) that scopes all data.

```mermaid
sequenceDiagram
    participant U as Owner
    participant FE as Web App
    participant AUTH as Firebase Auth
    participant FS as Firestore

    alt Email / password
        U->>FE: enter email + password
        FE->>AUTH: signIn / signUp
    else Google
        U->>FE: click "Continue with Google"
        FE->>AUTH: signInWithPopup(Google)
    end
    AUTH-->>FE: user credential (uid, token)
    FE->>FE: AuthContext stores user; guard unlocks app
    Note over FE,FS: Every subsequent read/write carries the uid;<br/>rules check ownerId == auth.uid
    FE->>FS: query where ownerId == uid
    FS-->>FE: only this owner's documents
```

The auth token is attached automatically by the Firebase SDK on every request, so rules can evaluate `request.auth.uid` without the app managing tokens by hand.

---

## 5. Data & Ownership Model

Firestore holds four owner-scoped concerns. Every document stores `ownerId`, and queries always filter by the signed-in owner.

```mermaid
erDiagram
    OWNER ||--o{ ROOM : "owns"
    OWNER ||--o{ TENANT : "owns"
    OWNER ||--o{ PAYMENT : "owns"
    ROOM ||--o{ TENANT : "houses"
    TENANT ||--o{ PAYMENT : "pays"

    OWNER {
        string uid PK
        string email
    }
    ROOM {
        string id PK
        string ownerId FK
        string roomNumber
        int capacity
    }
    TENANT {
        string id PK
        string ownerId FK
        string roomNumber FK
        string name
        string phone
        int rentAmount
        int dueDate
        string status
        string aadhaarPath
    }
    PAYMENT {
        string id PK
        string ownerId FK
        string tenantId FK
        int month
        int year
        int amount
        timestamp paidDate
    }
```

- **Rooms** are first-class: a room has a `capacity` (beds). Occupancy is derived by counting active tenants whose `roomNumber` matches — no denormalized counter to drift out of sync.
- **Payments** are an **append-only ledger**. A tenant's status for a month is computed by checking whether a payment exists for that month/year — this preserves history and supports future reporting, unlike a single boolean flag.

Full field-level shapes and constraints → **[data-model.md](data-model.md)**.

---

## 6. Secure Document Storage

Aadhaar/ID files never touch a public folder. They live in Firebase Storage under an owner-scoped path and are readable only by that owner.

```mermaid
flowchart LR
    A["Owner picks ID file in browser"] --> B["storageService.uploadDocument"]
    B --> C["Firebase Storage:<br/>owners/{uid}/tenants/{tenantId}/{file}"]
    C --> D["Store storage path on tenant doc"]
    D --> E["View: fetch authenticated download URL on demand"]
    E --> F{"Storage rule:<br/>path owner == auth.uid?"}
    F -- yes --> G["File served to owner"]
    F -- no --> H["Denied"]
```

Only the **storage path** is persisted on the tenant document, not a public link. A download URL is requested on demand while the owner is authenticated, and the Storage rule confirms the path's owner segment matches `auth.uid`. This replaces the original design, which wrote files into `public/` and served them at guessable public URLs (see [decisions.md](decisions.md) ADR-005).

---

## 7. End-to-End Flow — Record Rent

The everyday happy path: an owner marks a tenant paid.

```mermaid
sequenceDiagram
    participant U as Owner
    participant FE as Web App
    participant SVC as paymentService
    participant FS as Firestore

    U->>FE: open Tenants (current month)
    FE->>SVC: getTenants(uid) + getPayments(uid)
    SVC->>FS: query where ownerId == uid
    FS-->>FE: tenants + payments (this owner only)
    FE->>FE: compute Paid / Pending / Overdue per tenant
    U->>FE: tap "Paid" on a tenant
    FE->>SVC: recordPayment({ownerId, tenantId, month, year, amount})
    SVC->>FS: addDoc(payments) — rules check ownerId == auth.uid
    FS-->>FE: written
    FE->>FE: reload → tenant now shows Paid
```

---

## 8. Deployment _(planned)_

```mermaid
graph TB
    BROWSER["Browser / Mobile"] --> VERCEL["Vercel — Next.js + CDN"]
    VERCEL --> FBAUTH["Firebase Auth"]
    VERCEL --> FS[("Cloud Firestore")]
    VERCEL --> ST["Firebase Storage"]
    FS -. rules .-> RULES["Security Rules (versioned in repo)"]
    ST -. rules .-> RULES
```

| Concern | Approach |
|---------|----------|
| Frontend | Vercel (CDN, preview deploys per PR) |
| Backend | Managed Firebase (Auth, Firestore, Storage) — no servers to run |
| Config | Firebase web config via `NEXT_PUBLIC_*` env vars |
| Security | Rules deployed from `firestore.rules` / `storage.rules`; least-privilege by owner |
| Secrets | No server secrets; Firebase web config is public by design, protected by rules |
| CI/CD | Push → Vercel build/deploy; rules deployed via Firebase CLI |

---

## 9. Trust Boundary & Data Lifecycle

```mermaid
flowchart LR
    A["Owner signs up → uid issued"] --> B["Creates rooms / tenants (ownerId = uid)"]
    B --> C["Records payments (ledger grows, append-only)"]
    B --> D["Uploads ID → private Storage path"]
    C --> E["Tenant leaves → status = inactive (history kept)"]
    D --> F["Document readable only by owning uid"]
```

The security rules are the single trust boundary: because the app is client-only, correctness of isolation depends entirely on rules that check `ownerId == auth.uid` on Firestore and match the owner path segment on Storage. Tenant history is preserved on departure (soft-delete via `status`), and ID documents remain private to the owning account for their lifetime.
