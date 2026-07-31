<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# PG Manager — Agent Guide

Instructions for AI coding agents working in this repo. Read this first; do not re-derive it. Follow the **Prompt Contract** and **Working Rules** exactly.

## 1. Project Overview

PG Manager is a rent, room, and tenant manager for paying-guest / hostel owners in India. Each owner signs in and manages their own rooms, tenants, rent ledger (partial payments + deposits), tenure history, monthly reports, and ID documents; overdue tenants get one-tap WhatsApp reminders.

**Stack:** Next.js 16 (App Router, Turbopack, React 19), Tailwind CSS v4, Firebase (Auth, Cloud Firestore, Storage), `lucide-react` icons, `xlsx` bulk import, Vitest for unit tests. JavaScript for app code; a few `.tsx` files. Hosted on Vercel + Firebase.

## 2. Architecture

- **Client-only.** There is NO custom API server. Next.js client components talk directly to Firebase via the SDK. Almost every page is `"use client"`.
- **Security rules are the backend authorization layer.** `firestore.rules` and `storage.rules` are the trust boundary — they enforce all access control. Treat the client as untrusted.
- **Data ownership model:** every domain document carries `ownerId === auth.uid`. Rules reject any read/write where `ownerId != request.auth.uid`. Reads MUST filter by `ownerId`; writes MUST stamp it.
- **Services layer (`services/`)** is the only place that touches Firestore/Storage: `tenantService`, `paymentService`, `roomService`, `settingsService`, `storageService`. UI never calls the Firebase SDK directly — it calls services, passing `user.uid`.
- **Contexts (`contexts/`):** `AuthContext` (session), `SettingsContext` (per-owner settings/branding), `ToastContext` (`toast()` + promise-based `confirm()`).
- **Pure logic (`lib/`):** `rent.js` (status/tenure/rent-history math), `format.js` (`formatMoney`), `validation.js` (write validators), `authErrors.js`, `tenant.js`, `config.js`, `firebase.js`. These are unit-tested.
- **Route protection** is client-side in `components/AppShell.jsx` (Next 16 deprecates middleware → do not add server middleware for this). The guard is UX; rules are the real security.
- **Docs:** `docs/prd.md`, `architecture.md`, `decisions.md` (ADRs), `data-model.md`. Consult before changing data shapes or architecture.

## 3. Development Commands

```bash
npm run dev      # local dev server (http://localhost:3000)
npm run build    # production build + type check (must pass)
npm run lint     # eslint (see note below)
npm test         # vitest run — unit tests in lib/*.test.js

# Deploy Firebase rules (run after ANY change to *.rules):
firebase deploy --only firestore:rules,storage:rules
# Storage may be disabled (Blaze plan) — then deploy only:
firebase deploy --only firestore:rules
```

Lint note: the repo has a **pre-existing** ESLint backlog from Next 16's stricter React-Compiler rules. Do not attempt to fix it wholesale. Ensure only the **files you touch** are lint-clean.

## 4. Authentication

- `AUTH_ENABLED` (`lib/config.js`) is **ON by default** — `process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false"`. Production requires sign-in per owner.
- **Local sandbox mode:** set `NEXT_PUBLIC_AUTH_ENABLED=false` to run with no login gate under a fixed `LOCAL_OWNER_ID`. (Deployed rules require auth, so sandbox mode only works locally.)
- **Providers:** email/password and Google (`signInWithPopup`). Auth pages: `/login`, `/signup`, `/forgot-password` (all public routes in `AppShell`).
- **Password reset:** `AuthContext.resetPassword` → `/forgot-password`. It is enumeration-safe — never reveal whether an account exists.
- **Email verification is NOT implemented/enforced** yet. Do not assume `emailVerified`.
- **Auth error copy** goes through `lib/authErrors.friendlyAuthError` (enumeration-safe). Reuse it; do not distinguish wrong-password from unknown-account.

## 5. Firebase

- **Rules are authoritative.** After editing `firestore.rules`/`storage.rules`, they only take effect once deployed (see commands). Rules use **validate-if-present** style so legacy docs and partial updates aren't rejected for missing keys — preserve this.
- **`lib/validation.js` validators MUST mirror the Firestore rules.** If you change a rule's field constraints, update the matching validator (and its test), and vice versa.
- **App Check** is wired in `lib/firebase.js`, env-gated by `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` and browser-only. With no key it is a safe no-op — keep it that way; never make it a hard dependency.
- **Storage is OPTIONAL** (requires the Blaze plan) and must not be assumed to exist. Features that need it (ID document upload) must degrade gracefully.
- Firebase web config comes from `NEXT_PUBLIC_FIREBASE_*` env vars (`.env.local`, gitignored; `.env.example` documents them). The web config is public by design — not a secret.

## 6. UI Conventions

- **"Ledger" theme.** All colors/spacing come from CSS variables in `app/globals.css`. Light + dark are driven by `data-theme` on `<html>` (`ThemeToggle` + a no-flash script in the layout). NO gradients. Money uses tabular monospace numerals.
- **Use existing classes, don't invent styles:** `.card`, `.card-hover`, `.btn` + `.btn-primary|secondary|success|danger|ghost` (+ `.btn-sm`), `.input`, `.label`, `.badge` + `.badge-success|warning|danger|pending|neutral`, `.modal-backdrop`, `.num`, `.eyebrow`, and theme text helpers `.t-success|danger|warning|pending|accent|muted`. Prefer CSS vars (`var(--accent)`, `var(--text-muted)`) over hardcoded Tailwind grays/slates.
- **Reusable components:** `components/States.jsx` (`Loading`, `EmptyState`, `SkeletonRows`), `Sidebar`, `MobileNav`, `AppShell`, `ThemeToggle`. Use `toast()`/`confirm()` from `ToastContext` — never `window.alert`/`window.confirm`.
- **Accessibility (required):** associate `<label>` with inputs (`htmlFor`/`id`), add `autoComplete` on auth fields, use `role="alert"`/`aria-live` for errors, `aria-hidden` on decorative icons/emoji, keep focus states. Do not introduce a11y regressions.
- **Responsive-first / mobile-first:** sidebar on desktop, bottom `MobileNav` on mobile; wide content scrolls inside its own container. Test both widths mentally.
- **Money:** format with `formatMoney` from `lib/format.js`. Rent status/tenure: use helpers in `lib/rent.js` — do not recompute inline.

## 7. Coding Standards

- **Reuse existing code first.** Search `lib/`, `services/`, `components/` before writing anything new. No duplicate utilities — one helper, one home.
- Keep functions small; prefer composition over large conditionals.
- Match surrounding style (naming, comment density, formatting). This is a JS codebase; keep `.tsx` files type-safe.
- **No unnecessary dependencies.** Do not add a package without explicit approval; prefer the platform / existing deps.
- **Commit at meaningful checkpoints without being asked** — whenever a completed, working change is worth saving. Each is its own small, scoped **conventional commit** (`feat(...)`, `fix(...)`, `docs:`, `chore:`, `refactor:`, `test:`, `style(...)`); push after committing. Never bundle unrelated changes into one commit.
- Data shapes are documented in `docs/data-model.md` — keep it and the validators/rules in sync when shapes change.

## 8. Working Rules for AI Agents

- Work on **ONE** issue at a time.
- **Never** fix unrelated issues or refactor unless explicitly requested.
- **Never** add tests unless explicitly requested (when tests are requested, put them in `lib/*.test.js`).
- Keep changes **minimal**; preserve the architecture in §2.
- Reuse existing components/classes; do not restyle or re-theme unprompted.
- Do not change public APIs (service signatures, context values, exported helpers) without approval.
- Do not modify `.rules` casually — they gate production data; call out when a change requires a redeploy.
- Summarize changes when finished, then stop.

## 9. Definition of Done

A task is complete only when:
- The requested scope is finished — nothing more.
- No unrelated files were modified.
- `npm run build` passes and lint is clean for the touched files.
- Tests pass (`npm test`) if tests exist for the touched area.
- No obvious accessibility regressions.
- Existing functionality is preserved (no breaking changes).
- A brief implementation summary is provided.

## Prompt Contract

Unless explicitly requested:

- Do NOT continue after completing the requested task.
- Do NOT improve unrelated code.
- Do NOT refactor unrelated files.
- Do NOT add features beyond the requested scope.
- Do NOT write tests unless explicitly requested.
- Do NOT modify documentation unless requested.
- Do NOT fix lint errors outside touched files.
- Ask before making architectural changes.

When the task is complete:

1. Summarize changes.
2. Mention any follow-up recommendations.
3. STOP.
