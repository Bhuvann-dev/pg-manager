import { describe, it, expect } from "vitest";
import { isPhoneTaken } from "./tenant";

const tenants = [
  { id: "a", phone: "9876543210", status: "active" },
  { id: "b", phone: "9000000000", status: "inactive" } // left
];

describe("isPhoneTaken", () => {
  it("flags a phone used by an active tenant", () => {
    expect(isPhoneTaken(tenants, "9876543210")).toBe(true);
  });

  it("does NOT flag a phone that only belongs to a tenant who left", () => {
    // the returning-tenant bug: this must be allowed
    expect(isPhoneTaken(tenants, "9000000000")).toBe(false);
  });

  it("allows a brand-new number", () => {
    expect(isPhoneTaken(tenants, "9123456789")).toBe(false);
  });

  it("excludes the tenant being edited", () => {
    expect(isPhoneTaken(tenants, "9876543210", "a")).toBe(false);
  });

  it("compares as strings and tolerates missing phones", () => {
    const list = [{ id: "c", phone: 9876543210, status: "active" }];
    expect(isPhoneTaken(list, "9876543210")).toBe(true);
    expect(isPhoneTaken(list, undefined)).toBe(false);
  });
});
