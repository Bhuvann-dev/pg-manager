<div align="center">

# 🏠 PG Manager

### The rent, room, and tenant manager for paying-guest & hostel owners.

*Sign in → add your rooms and tenants → track rent, occupancy, and IDs in one place → nudge overdue tenants on WhatsApp.*

[![Status](https://img.shields.io/badge/status-in%20development-yellow)]()
[![Frontend](https://img.shields.io/badge/frontend-Next.js%20%2B%20React-black)]()
[![Backend](https://img.shields.io/badge/backend-Firebase-ffca28)]()
[![Database](https://img.shields.io/badge/database-Cloud%20Firestore-ff8f00)]()
[![Auth](https://img.shields.io/badge/auth-Firebase%20Auth-4285F4)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

<!-- Replace with a real link once deployed -->
**[ Live Demo (coming soon) ]()** · **[PRD](docs/prd.md)** · **[Architecture](docs/architecture.md)** · **[Decisions](docs/decisions.md)** · **[Data Model](docs/data-model.md)**

</div>

---

## The Problem

India runs on paying-guest accommodations and small hostels — and most of their owners still run rent on a paper register, a WhatsApp group, and a messy Excel sheet. That means:

- **No single source of truth.** Who paid this month? Who's overdue? Which bed is empty? The answer lives in the owner's head.
- **Awkward follow-ups.** Chasing rent over WhatsApp, one tenant at a time, from memory.
- **Sensitive IDs everywhere.** Aadhaar and ID photos sit in phone galleries and email, with no access control.
- **Nothing is multi-owner safe.** Generic spreadsheets don't isolate one owner's data from another's.

**PG Manager gives every PG owner a simple, private, phone-friendly control panel for their property.**

## What It Does

| Step | What happens |
|------|--------------|
| **1. Sign in** | Owner signs up with email/password or Google. Their data is fully isolated from every other owner. |
| **2. Set up rooms** | Define rooms with a bed capacity. The app tracks occupancy and shows which beds are free. |
| **3. Add tenants** | Add tenants one by one (with validation) or bulk-import from Excel/CSV, and assign each to a room. |
| **4. Track rent** | Record each payment to a per-tenant **ledger** (month, amount, date). The dashboard shows paid / pending / overdue at a glance. |
| **5. Store IDs safely** | Upload Aadhaar/ID to private per-owner storage — never a public folder. |
| **6. Nudge** | One tap sends a pre-filled WhatsApp rent reminder to an overdue tenant. |

## Screenshots

> _Coming soon — UI in active development. Placeholder frames below._

| Dashboard | Tenants | Rooms |
|-----------|---------|-------|
| _(screenshot)_ | _(screenshot)_ | _(screenshot)_ |

## Architecture at a Glance

PG Manager is a **Firebase-native, serverless** web app. There is no custom API server — the Next.js client talks directly to Firebase, and **security rules are the backend**: they enforce that an owner can only ever read or write their own data.

```
Client (Next.js + React)
        │
        ▼
Firebase
 ├─ Firebase Auth        (email/password + Google → owner identity)
 ├─ Cloud Firestore      (owners · rooms · tenants · payments)
 ├─ Firebase Storage     (private tenant ID documents)
 └─ Security Rules       (per-owner isolation — the trust boundary)
```

Every document carries an `ownerId`. Rules reject any request whose `ownerId != auth.uid`, so isolation holds even though the browser talks to the database directly. Full breakdown with diagrams → **[docs/architecture.md](docs/architecture.md)**.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Auth | Firebase Auth — email/password + Google |
| Database | Cloud Firestore |
| File storage | Firebase Storage (private, per-owner) |
| Trust boundary | Firestore & Storage Security Rules |
| Bulk import | `xlsx` (Excel/CSV → tenants) |
| Icons | `lucide-react` |
| Hosting | Vercel (web) + Firebase (backend services) |

Why each of these? → **[docs/decisions.md](docs/decisions.md)**.

## Documentation

This repo is documented like a real product, not a code dump:

- 📄 **[docs/prd.md](docs/prd.md)** — the problem, users, requirements, and success metrics.
- 🏛️ **[docs/architecture.md](docs/architecture.md)** — how the system fits together, with diagrams.
- 🧭 **[docs/decisions.md](docs/decisions.md)** — the *why* behind every major technical choice (ADRs).
- 🗄️ **[docs/data-model.md](docs/data-model.md)** — Firestore collections, Storage layout, and the security-rules contract.

## Getting Started

PG Manager is a single Next.js app backed by a Firebase project.

```bash
git clone https://github.com/Bhuvann-dev/pg-manager.git && cd pg-manager

# 1. Install dependencies
npm install

# 2. Configure Firebase
cp .env.example .env.local   # paste your Firebase web config values

# 3. Run it
npm run dev                  # http://localhost:3000
```

**Firebase setup (one time):** create a Firebase project, then enable
**Authentication** (Email/Password + Google), **Cloud Firestore**, and
**Storage**. Copy the web-app config into `.env.local` (see `.env.example`),
and deploy the security rules in [`firestore.rules`](firestore.rules) and
[`storage.rules`](storage.rules). Details in
[docs/data-model.md](docs/data-model.md).

## Roadmap

- [x] Rent-manager MVP: dashboard, tenants, mark-paid, WhatsApp reminders
- [x] Product definition (PRD), architecture, and ADRs
- [x] Owner accounts (email/password + Google) with per-owner data isolation
- [x] Rooms & beds with live occupancy / vacancy
- [x] Per-tenant rent ledger (payment history, not just a paid flag)
- [x] Secure ID documents in Firebase Storage with per-owner rules
- [x] Partial payments & security-deposit tracking
- [x] Tenant detail page with quick actions and room transfer
- [x] Dashboard collection insights + follow-up list
- [x] Monthly rent report with Excel / PDF export
- [ ] Deployed public demo
- [ ] Multi-property support per owner
- [ ] Automated recurring reminders

See the full breakdown in [GitHub Issues](../../issues).

## Status

🚧 **In active development.** Built as a portfolio-grade project — planning and documentation first, then features shipped in clean, reviewable slices.

## License

MIT © 2026 Bhuvan N
