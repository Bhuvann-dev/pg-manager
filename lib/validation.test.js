import { describe, it, expect } from "vitest";
import {
  validateTenant,
  validatePayment,
  validateRoom,
  validateSettings
} from "./validation";

describe("validateTenant", () => {
  it("accepts a well-formed tenant", () => {
    expect(
      validateTenant({
        name: "Asha",
        phone: "9876543210",
        roomNumber: "101",
        rentAmount: 5000,
        dueDate: 10,
        deposit: 10000
      }).ok
    ).toBe(true);
  });

  it("accepts a partial update (present-only)", () => {
    expect(validateTenant({ rentAmount: 6000 }).ok).toBe(true);
    expect(validateTenant({ dueDate: null }).ok).toBe(true);
  });

  it("rejects a non-numeric rent", () => {
    const r = validateTenant({ rentAmount: "5000" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/rentAmount/);
  });

  it("rejects an out-of-range due date", () => {
    expect(validateTenant({ dueDate: 40 }).ok).toBe(false);
    expect(validateTenant({ dueDate: 0 }).ok).toBe(false);
  });

  it("rejects an over-long name and an unknown status", () => {
    expect(validateTenant({ name: "x".repeat(101) }).ok).toBe(false);
    expect(validateTenant({ status: "banned" }).ok).toBe(false);
  });

  it("rejects a negative rent", () => {
    expect(validateTenant({ rentAmount: -1 }).ok).toBe(false);
  });
});

describe("validatePayment", () => {
  it("accepts a rent payment and a negative deposit refund", () => {
    expect(
      validatePayment({ tenantId: "t1", amount: 5000, month: 7, year: 2026, type: "rent" }).ok
    ).toBe(true);
    expect(
      validatePayment({ tenantId: "t1", amount: -10000, month: 7, year: 2026, type: "deposit" }).ok
    ).toBe(true);
  });

  it("rejects bad month/year and unknown type", () => {
    expect(validatePayment({ month: 13 }).ok).toBe(false);
    expect(validatePayment({ year: 1999 }).ok).toBe(false);
    expect(validatePayment({ type: "bonus" }).ok).toBe(false);
  });

  it("rejects a non-integer amount", () => {
    expect(validatePayment({ amount: 12.5 }).ok).toBe(false);
  });
});

describe("validateRoom", () => {
  it("accepts a valid room", () => {
    expect(validateRoom({ roomNumber: "101", capacity: 4, notes: "AC" }).ok).toBe(true);
  });

  it("rejects capacity below 1 or non-integer", () => {
    expect(validateRoom({ capacity: 0 }).ok).toBe(false);
    expect(validateRoom({ capacity: 2.5 }).ok).toBe(false);
  });
});

describe("validateSettings", () => {
  it("accepts valid settings and tolerates missing fields", () => {
    expect(validateSettings({ pgName: "Sunrise", upiId: "a@bank" }).ok).toBe(true);
    expect(validateSettings({}).ok).toBe(true);
  });

  it("rejects an over-long field", () => {
    expect(validateSettings({ pgName: "x".repeat(121) }).ok).toBe(false);
  });
});
