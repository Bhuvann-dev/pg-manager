"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { friendlyAuthError } from "../../lib/authErrors";

export default function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Completes Google sign-in that used the redirect fallback: once the
  // session is present (on return to the app), continue into the app.
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(friendlyAuthError(err));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      router.replace("/");
    } catch (err) {
      setError(friendlyAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <span
            className="grid place-items-center h-10 w-10 rounded-lg text-white text-lg"
            style={{ background: "var(--accent)" }}
          >
            🏠
          </span>
          <span className="font-bold text-lg tracking-tight">PG Manager</span>
        </div>

        <h1 className="text-xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Sign in to manage your property.
        </p>

        {error && (
          <p className="badge-danger text-sm p-3 rounded-lg mb-4 block">
            {error}
          </p>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="label">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5 text-sm" style={{ color: "var(--text-faint)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          or
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn btn-secondary w-full"
        >
          Continue with Google
        </button>

        <p className="text-sm mt-6 text-center" style={{ color: "var(--text-muted)" }}>
          New here?{" "}
          <Link href="/signup" style={{ color: "var(--accent)" }} className="hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
