import { describe, it, expect } from "vitest";
import { friendlyAuthError } from "./authErrors";

describe("friendlyAuthError", () => {
  it("does not distinguish wrong password from unknown account (enumeration-safe)", () => {
    const a = friendlyAuthError({ code: "auth/wrong-password" });
    const b = friendlyAuthError({ code: "auth/user-not-found" });
    const c = friendlyAuthError({ code: "auth/invalid-credential" });
    expect(a).toBe("Incorrect email or password.");
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it("maps common actionable codes", () => {
    expect(friendlyAuthError({ code: "auth/invalid-email" })).toMatch(/valid email/i);
    expect(friendlyAuthError({ code: "auth/too-many-requests" })).toMatch(/too many/i);
    expect(friendlyAuthError({ code: "auth/network-request-failed" })).toMatch(/network/i);
    expect(friendlyAuthError({ code: "auth/popup-blocked" })).toMatch(/popup/i);
    expect(
      friendlyAuthError({ code: "auth/account-exists-with-different-credential" })
    ).toMatch(/different sign-in/i);
  });

  it("falls back to a generic message with the raw code for unknown errors", () => {
    const msg = friendlyAuthError({ code: "auth/some-new-code" });
    expect(msg).toMatch(/something went wrong/i);
    expect(msg).toContain("auth/some-new-code");
  });

  it("handles a missing/empty error object", () => {
    expect(friendlyAuthError(undefined)).toMatch(/something went wrong/i);
    expect(friendlyAuthError({})).toMatch(/something went wrong/i);
  });
});
