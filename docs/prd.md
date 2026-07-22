# PG Manager — Product Requirements Document (PRD)

**Author:** Arpitha N · **Status:** Draft v1 (MVP) · **Last updated:** 2026-07-22

---

## 1. Problem Statement

Paying-guest (PG) accommodations and small hostels are everywhere in India, but the people who run them manage the business by hand. A typical owner tracks rent in a paper register or a personal Excel sheet, chases payments over WhatsApp from memory, and keeps tenant ID proofs (Aadhaar) scattered across their phone gallery and email.

This breaks down as soon as the property grows past a handful of beds:

- **No reliable answer** to "who has paid this month?", "who is overdue?", or "which bed is free?".
- **Manual, error-prone reminders** — the owner scrolls contacts and re-types the same message every month.
- **Sensitive documents with no access control** — Aadhaar images live wherever they happened to be saved.
- **No separation between owners** — a shared spreadsheet or generic tool has no notion of "my property vs. yours".

Owners don't need an enterprise property-management suite. They need a focused, private, phone-friendly tool for the daily job: rooms, tenants, rent, and reminders.

## 2. Goal & Vision

**Goal (MVP):** Let a PG owner sign in, set up their rooms, add their tenants, and — from one dashboard — see who has paid, who is overdue, and which beds are free, with one-tap WhatsApp reminders and private ID storage.

**Vision:** Become the default lightweight operating system for independent PG and hostel owners in India — the place they open every morning to run rent and occupancy.

## 3. Target User

| Attribute | Detail |
|-----------|--------|
| **Primary** | Independent PG / hostel owners and managers (roughly 5–100 beds). |
| **Context** | Currently using paper registers, WhatsApp, and Excel. On a phone most of the day. |
| **Tech comfort** | Comfortable with WhatsApp and basic apps; low patience for complex software. |
| **Willingness to pay** | Low at first → a small monthly subscription once it saves them real time. |

**Core user story (MVP):**

> As a PG owner, I sign in → set up my rooms → add my tenants → and each month I can see who has paid, nudge who hasn't, and know which beds are open — without a register or a spreadsheet.

## 4. Success Metrics

| Metric | Target (MVP) |
|--------|--------------|
| Time to add first tenant after sign-up | < 3 min |
| Owners who record at least one payment in week 1 | > 60% |
| Overdue tenants nudged via WhatsApp / month | > 50% of overdue |
| Data-isolation incidents (one owner seeing another's data) | 0 |
| Week-4 retention (owner returns to record rent) | > 40% |

---

## 5. Functional Requirements

### FR-1 — Owner Accounts & Data Isolation
- Sign up / sign in with **email + password** and **Google**.
- Every owner sees **only their own** rooms, tenants, and payments.
- All app routes require an authenticated owner; unauthenticated users are redirected to sign-in.
- Sign-out from anywhere in the app.

### FR-2 — Rooms & Bed Occupancy
- Create, edit, and delete rooms with a **bed capacity**.
- Show **occupancy** (active tenants assigned) and **vacancy** (free beds) per room and overall.
- Prevent assigning more tenants to a room than its capacity.

### FR-3 — Tenant Management
- Add a tenant with name, phone, room, monthly rent, and rent due-date (1–31).
- Validate input: valid 10-digit Indian phone, no duplicate phone, room within capacity, sane rent and due date.
- **Bulk import** tenants from Excel/CSV.
- Edit tenant details; mark a tenant as **left** (deactivate without deleting history).

### FR-4 — Rent Ledger
- Record a payment against a tenant for a given **month/year** with amount and date.
- Maintain a **per-tenant payment history** (ledger), not just a single "paid" flag.
- Derive each tenant's current-month status: **Paid / Pending / Overdue** (overdue = unpaid and past the due date).
- Correct a mistaken payment (remove / re-record).

### FR-5 — Dashboard
- At-a-glance counts for the current month: **total tenants, paid, pending, overdue**.
- **Occupancy summary**: total beds, occupied, vacant.
- Overdue tenants surfaced for quick follow-up.

### FR-6 — WhatsApp Reminders
- One tap opens WhatsApp with a **pre-filled, personalized** rent reminder to the tenant.
- Normalize Indian phone numbers safely (country code handling).

### FR-7 — Secure ID Documents
- Upload a tenant's Aadhaar/ID (image or PDF, size-limited).
- Store in **private per-owner storage** — never a public URL or public folder.
- Only the owning account can view a document.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | Per-owner isolation enforced by Firestore & Storage **security rules**, not just UI. No public document URLs. |
| **Privacy** | Tenant IDs are sensitive PII (Aadhaar). Documents are access-controlled and never committed to source control. India DPDP-aware. |
| **Performance** | Dashboard and lists load in < 2 s for a typical property (≤ 100 tenants). |
| **Usability** | Mobile-first; usable one-handed on a phone; minimal typing; clear paid/overdue color cues. |
| **Reliability** | Backed by managed Firebase services; graceful handling of offline / failed writes. |
| **Maintainability** | Data access isolated in a `services/` layer; auth isolated in a context; rules versioned in-repo. |
| **Cost** | Fits comfortably within Firebase's usage-based pricing for a small operator. |

---

## 7. Scope

### In Scope (MVP)
Owner accounts with data isolation · rooms & occupancy · tenant CRUD + bulk import · rent ledger with paid/pending/overdue · dashboard · WhatsApp reminders · secure ID documents.

### Out of Scope (MVP)
- Multi-property management under one owner.
- Partial payments, deposits, and refunds.
- Tenant-facing app or self-service portal.
- Automated recurring reminders / scheduling.
- Payments collection / payment-gateway integration.
- Accounting, GST, or expense tracking.

---

## 8. Future Scope

**Near-term:** deployed public demo, partial payments & security-deposit tracking, monthly rent report/export (PDF/Excel), search across left tenants.

**Mid-term:** multi-property support, automated reminder scheduling, tenant onboarding links, room-change history.

**Long-term / monetization:** freemium (free up to N beds, paid beyond), online rent collection via a payment gateway, expense & profit tracking, multi-manager access per property.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| One owner's data leaking to another | Enforce `ownerId == auth.uid` in security rules; treat the client as untrusted; test rules. |
| Aadhaar/PII exposure | Private Storage with per-owner rules; no public folder; documents gitignored; short-lived access. |
| Client-only app trusting the browser | Rules are the real backend — every read/write is validated server-side by Firebase. |
| Firebase cost surprises | Usage-based; small properties stay within low tiers; avoid unbounded reads (scoped queries). |
| Bulk import with dirty data | Validate each row; skip incomplete rows; report how many imported. |

---

## 10. Success Definition

The MVP is successful if a PG owner can, on their phone and without training, sign up, set up their rooms and tenants, and run a full rent cycle — seeing who paid, nudging who didn't, and knowing which beds are free — with the confidence that their tenants' data and IDs are private to them.
