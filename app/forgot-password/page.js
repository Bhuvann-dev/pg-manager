"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { friendlyAuthError } from "../../lib/authErrors";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Don't reveal whether the account exists (enumeration-safe): a
      // "no account" outcome shows the same confirmation as success.
      if (err?.code && err.code.includes("user-not-found")) {
        setSent(true);
      } else {
        setError(friendlyAuthError(err));
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <span
            className="grid place-items-center h-10 w-10 rounded-lg text-white text-lg"
            style={{ background: "var(--accent)" }}
            aria-hidden="true"
          >
            🏠
          </span>
          <span className="font-bold text-lg tracking-tight">PG Manager</span>
        </div>

        <h1 className="text-xl font-bold mb-1">Reset your password</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Enter your email and we&apos;ll send a reset link.
        </p>

        {sent ? (
          <div>
            <p
              className="badge-success text-sm p-3 rounded-lg mb-5 block"
              role="status"
            >
              If an account exists for <strong>{email}</strong>, a password
              reset link is on its way. Check your inbox (and spam).
            </p>
            <Link href="/login" className="btn btn-primary w-full">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p
                className="badge-danger text-sm p-3 rounded-lg mb-4 block"
                role="alert"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="label">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input mt-1"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p
              className="text-sm mt-6 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              Remembered it?{" "}
              <Link
                href="/login"
                style={{ color: "var(--accent)" }}
                className="hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
