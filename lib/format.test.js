import { describe, it, expect } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("groups with the Indian numbering system", () => {
    expect(formatMoney(1000)).toBe("₹1,000");
    expect(formatMoney(100000)).toBe("₹1,00,000");
  });

  it("handles zero and non-numbers", () => {
    expect(formatMoney(0)).toBe("₹0");
    expect(formatMoney(undefined)).toBe("₹0");
    expect(formatMoney("abc")).toBe("₹0");
  });

  it("puts the minus sign before the symbol for refunds", () => {
    expect(formatMoney(-500)).toBe("-₹500");
  });
});
