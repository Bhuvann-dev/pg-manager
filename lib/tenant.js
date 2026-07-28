/*
Tenant helpers (pure, testable).
*/

/*
Is a phone number already used by an ACTIVE tenant?

Tenants who have left (status "inactive") are ignored, so a returning
tenant can re-join with the same number — their old record stays as
history. `excludeId` skips the tenant currently being edited.
*/
export function isPhoneTaken(tenants, phone, excludeId = null) {
  const target = String(phone || "");
  return tenants.some(
    (t) =>
      t.status !== "inactive" &&
      t.id !== excludeId &&
      String(t.phone) === target
  );
}
