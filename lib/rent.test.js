import { describe, it, expect } from "vitest";
import {
  rentPaidForMonth,
  depositPaid,
  rentStatus,
  summarizeMonth,
  monthsPaid,
  tenureDays,
  rentForMonth,
  RENT,
  DEPOSIT
} from "./rent";

const NOW = new Date("2026-07-15T00:00:00"); // day 15 of July 2026

const tenant = (over = {}) => ({
  id: "t1",
  name: "Asha",
  rentAmount: 5000,
  dueDate: 10,
  status: "active",
  ...over
});

const rent = (amount, month, year = 2026, over = {}) => ({
  tenantId: "t1",
  type: RENT,
  amount,
  month,
  year,
  ...over
});

describe("rentPaidForMonth", () => {
  it("sums only matching tenant/month/year rent payments", () => {
    const payments = [
      rent(2000, 7),
      rent(1000, 7),
      rent(5000, 6),
      { ...rent(9999, 7), tenantId: "other" }
    ];
    expect(rentPaidForMonth(payments, "t1", 7, 2026)).toBe(3000);
  });

  it("treats a payment with no type as rent (legacy data)", () => {
    const payments = [{ tenantId: "t1", amount: 500, month: 7, year: 2026 }];
    expect(rentPaidForMonth(payments, "t1", 7, 2026)).toBe(500);
  });
});

describe("depositPaid", () => {
  it("sums deposit entries and nets refunds", () => {
    const payments = [
      { tenantId: "t1", type: DEPOSIT, amount: 10000, month: 1, year: 2026 },
      { tenantId: "t1", type: DEPOSIT, amount: -10000, month: 6, year: 2026 },
      rent(5000, 7)
    ];
    expect(depositPaid(payments, "t1")).toBe(0);
  });
});

describe("rentStatus", () => {
  it("is paid when the month is fully covered", () => {
    const s = rentStatus(tenant(), [rent(5000, 7)], NOW);
    expect(s.status).toBe("paid");
    expect(s.balance).toBe(0);
  });

  it("is partial when some but not all is paid", () => {
    const s = rentStatus(tenant(), [rent(2000, 7)], NOW);
    expect(s.status).toBe("partial");
    expect(s.paid).toBe(2000);
    expect(s.balance).toBe(3000);
  });

  it("is overdue when unpaid and past the due date", () => {
    // due day 10, today is the 15th, nothing paid
    const s = rentStatus(tenant({ dueDate: 10 }), [], NOW);
    expect(s.status).toBe("overdue");
  });

  it("is pending when unpaid but still before the due date", () => {
    const s = rentStatus(tenant({ dueDate: 20 }), [], NOW);
    expect(s.status).toBe("pending");
  });
});

describe("summarizeMonth", () => {
  it("rolls up counts and money across tenants", () => {
    const tenants = [
      tenant({ id: "a", rentAmount: 5000, dueDate: 10 }),
      tenant({ id: "b", rentAmount: 4000, dueDate: 20 }),
      tenant({ id: "c", rentAmount: 3000, dueDate: 10 })
    ];
    const payments = [
      { tenantId: "a", type: RENT, amount: 5000, month: 7, year: 2026 }, // paid
      { tenantId: "b", type: RENT, amount: 1000, month: 7, year: 2026 } // partial
      // c: nothing, due day 10 < 15 -> overdue
    ];
    const sum = summarizeMonth(tenants, payments, NOW);
    expect(sum.total).toBe(3);
    expect(sum.paid).toBe(1);
    expect(sum.partial).toBe(1);
    expect(sum.overdue).toBe(1);
    expect(sum.expected).toBe(12000);
    expect(sum.collected).toBe(6000);
    expect(sum.overdueAmount).toBe(3000);
    expect(sum.collectionRate).toBe(50);
  });
});

describe("rentForMonth", () => {
  const t = tenant({
    rentAmount: 6000,
    rentHistory: [
      { amount: 5000, effectiveFrom: "2026-01" },
      { amount: 6000, effectiveFrom: "2026-06" }
    ]
  });

  it("uses the rate effective for the target month", () => {
    expect(rentForMonth(t, 2026, 3)).toBe(5000);
    expect(rentForMonth(t, 2026, 6)).toBe(6000);
    expect(rentForMonth(t, 2026, 9)).toBe(6000);
  });

  it("falls back to rentAmount with no history", () => {
    expect(rentForMonth(tenant({ rentAmount: 4200 }), 2026, 5)).toBe(4200);
  });
});

describe("monthsPaid", () => {
  it("counts distinct fully-paid months, honoring rent history", () => {
    const t = tenant({
      rentAmount: 6000,
      rentHistory: [
        { amount: 5000, effectiveFrom: "2026-01" },
        { amount: 6000, effectiveFrom: "2026-06" }
      ]
    });
    const payments = [
      rent(5000, 3), // fully paid at old rate
      rent(3000, 4), // partial -> not counted
      rent(6000, 6) // fully paid at new rate
    ];
    expect(monthsPaid(t, payments)).toBe(2);
  });
});

describe("tenureDays", () => {
  it("counts join date to left date", () => {
    const t = tenant({
      joinDate: new Date(2026, 0, 1),
      leftDate: new Date(2026, 0, 31),
      status: "inactive"
    });
    expect(tenureDays(t, NOW)).toBe(30);
  });

  it("counts join date to now when still active", () => {
    const t = tenant({ joinDate: new Date(2026, 6, 5) });
    expect(tenureDays(t, new Date(2026, 6, 15))).toBe(10);
  });

  it("returns null with no join/created date", () => {
    expect(tenureDays(tenant(), NOW)).toBe(null);
  });
});
