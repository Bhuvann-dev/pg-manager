/*
Write validation (pure, testable) — mirrors the Firestore security rules
so the client rejects malformed data early with a clear message, while the
rules remain the authoritative backend enforcement (defense in depth).

Validators are PRESENT-ONLY: a field is checked only when supplied, so
partial updates and legacy documents are never rejected for missing keys.
Each returns { ok, error }.
*/

const isInt = (v) => typeof v === "number" && Number.isInteger(v);

const present = (o, k) =>
  o != null &&
  Object.prototype.hasOwnProperty.call(o, k) &&
  o[k] !== undefined &&
  o[k] !== null;

function checkString(o, k, max) {
  if (!present(o, k)) return null;
  if (typeof o[k] !== "string") return `${k} must be text.`;
  if (o[k].length > max) return `${k} is too long.`;
  return null;
}

function checkInt(o, k, lo, hi) {
  if (!present(o, k)) return null;
  if (!isInt(o[k])) return `${k} must be a whole number.`;
  if (o[k] < lo || o[k] > hi) return `${k} is out of range.`;
  return null;
}

function checkEnum(o, k, allowed) {
  if (!present(o, k)) return null;
  if (!allowed.includes(o[k])) return `${k} is invalid.`;
  return null;
}

function first(errors) {
  const error = errors.filter(Boolean)[0] || null;
  return { ok: error === null, error };
}

export function validateTenant(t) {
  return first([
    checkString(t, "name", 100),
    checkString(t, "phone", 20),
    checkString(t, "roomNumber", 30),
    checkInt(t, "rentAmount", 0, 100_000_000),
    checkInt(t, "dueDate", 1, 31),
    checkInt(t, "deposit", 0, 100_000_000),
    checkString(t, "aadhaarPath", 500),
    checkEnum(t, "status", ["active", "inactive"])
  ]);
}

export function validatePayment(p) {
  return first([
    checkEnum(p, "type", ["rent", "deposit"]),
    checkString(p, "tenantId", 200),
    checkString(p, "tenantName", 100),
    checkInt(p, "amount", -100_000_000, 100_000_000),
    checkInt(p, "month", 1, 12),
    checkInt(p, "year", 2000, 2100)
  ]);
}

export function validateRoom(r) {
  return first([
    checkString(r, "roomNumber", 30),
    checkInt(r, "capacity", 1, 100_000),
    checkString(r, "notes", 500)
  ]);
}

export function validateSettings(s) {
  return first([
    checkString(s, "pgName", 120),
    checkString(s, "ownerName", 120),
    checkString(s, "upiId", 120)
  ]);
}
