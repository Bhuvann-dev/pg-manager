# PG Manager — Data Model & Security Contract

**Status:** v1 · **Backend:** Cloud Firestore + Firebase Storage

This document is the contract for PG Manager's data. Because the app is client-only (see [architecture.md](architecture.md)), this schema **and its security rules together** are the backend. Every collection is owner-scoped: each document stores an `ownerId` equal to the signed-in owner's `auth.uid`, and rules enforce it.

The concrete rules live in [`../firestore.rules`](../firestore.rules) and [`../storage.rules`](../storage.rules).

---

## Collections

### `rooms`

A room in the property, with a bed capacity. Occupancy is **derived** by counting active tenants (never stored), so it can't drift.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ownerId` | string | yes | `auth.uid` of the owning account. Scopes and protects the row. |
| `roomNumber` | string | yes | Human room label, unique per owner (e.g. `"101"`). Join key for tenants. |
| `capacity` | int | yes | Number of beds (≥ 1). Used to compute vacancy and block over-filling. |
| `notes` | string | no | Free text (e.g. "AC, attached bath"). |
| `createdAt` | timestamp | yes | Set on creation. |

### `tenants`

A person staying in the property. Soft-deleted on departure (`status = "inactive"`) so payment history is preserved.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ownerId` | string | yes | `auth.uid` of the owning account. |
| `name` | string | yes | Tenant's full name. |
| `phone` | string | yes | 10-digit Indian mobile (`/^[6-9]\d{9}$/`), unique per owner. |
| `roomNumber` | string | yes | References a `rooms.roomNumber` for this owner. |
| `rentAmount` | int | yes | Monthly rent in ₹ (> 0). |
| `dueDate` | int (1–31) | yes | Day of month rent is due. Drives overdue calculation. |
| `aadhaarPath` | string \| null | no | **Storage path** (not a public URL) to the ID document. |
| `status` | `"active"` \| `"inactive"` | yes | `inactive` = tenant has left; hidden from active lists, history kept. |
| `leftDate` | timestamp | no | Set when marked as left. |
| `createdAt` | timestamp | yes | Set on creation. |

### `payments`

An append-only rent **ledger**. One document per rent payment. A tenant's status for a month is derived by checking whether a matching payment exists — there is no boolean "paid" flag on the tenant.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ownerId` | string | yes | `auth.uid` of the owning account. |
| `tenantId` | string | yes | `tenants` document id this payment is for. |
| `tenantName` | string | yes | Denormalized for display in history without a join. |
| `amount` | int | yes | Amount paid in ₹. |
| `month` | int (1–12) | yes | Rent month this payment covers. |
| `year` | int | yes | Rent year this payment covers. |
| `status` | `"paid"` | yes | Reserved for future states (partial, etc.). |
| `paidDate` | timestamp | yes | When the payment was received. |
| `createdAt` | timestamp | yes | Set on creation. |

---

## Derived values (computed in the client, never stored)

| Value | How it's computed |
|-------|-------------------|
| **Tenant paid (this month)** | A `payments` doc exists with `tenantId`, `month = now`, `year = now`. |
| **Tenant overdue** | Not paid this month **and** `dueDate < today's date`. |
| **Tenant pending** | Not paid this month **and** `dueDate >= today's date`. |
| **Room occupancy** | Count of `active` tenants whose `roomNumber` matches the room. |
| **Room vacancy** | `capacity − occupancy`. |

Deriving these keeps the source of truth in one place (the ledger + tenant records) and avoids counters that fall out of sync.

---

## Storage layout

Tenant ID documents live in Firebase Storage under an owner-scoped path. Only the storage path is persisted on the tenant document — never a public URL.

```
owners/
  {ownerUid}/
    tenants/
      {tenantId}/
        {timestamp}_{filename}      ← Aadhaar / ID (image or PDF)
```

A download URL is requested **on demand** while the owner is authenticated; it is not stored. The Storage rule confirms the `{ownerUid}` path segment equals `request.auth.uid`.

---

## Security rules contract

The rules enforce a single, uniform predicate across every collection: **you must be signed in, and you may only touch documents you own.**

**Firestore** (`firestore.rules`):

```
match /{collection}/{docId} {
  allow read:   if isSignedIn() && resource.data.ownerId == uid();
  allow create: if isSignedIn() && request.resource.data.ownerId == uid();
  allow update, delete: if isSignedIn() && resource.data.ownerId == uid();
}
```
_where `isSignedIn()` is `request.auth != null` and `uid()` is `request.auth.uid`, applied to `rooms`, `tenants`, and `payments`._

**Storage** (`storage.rules`):

```
match /owners/{ownerUid}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == ownerUid;
}
```

### Consequences for queries
- Every client query **must** filter by `ownerId == currentUser.uid`, both because rules require it and to avoid reading documents the rules would reject.
- Firestore may request a **composite index** for owner-scoped compound queries; the Firebase console provides a one-click link to create it when needed.

---

## Indexes _(as needed)_

Single-field `ownerId` filters need no custom index. If a compound query is added later (e.g. `ownerId` + `status` + ordering), Firestore will prompt for the exact composite index to create. None are required for the current queries.
