"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

export default function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <span
            className="grid place-items-center h-10 w-10 rounded-xl text-white shadow-lg text-lg"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))"
            }}
          >
            🏠
          </span>
          <span className="font-bold text-lg tracking-tight">PG Manager</span>
        </div>

        <h1 className="text-xl font-bold mb-1">Create your account</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Start managing your PG in minutes.
        </p>

        {error && (
          <p className="badge-danger text-sm p-3 rounded-lg mb-4 block">
            {error}
          </p>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input mt-1"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5 text-sm" style={{ color: "var(--text-faint)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          or
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="btn btn-secondary w-full"
        >
          Continue with Google
        </button>

        <p className="text-sm mt-6 text-center" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }} className="hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function friendlyError(err) {
  const code = err?.code || "";

  if (code.includes("email-already-in-use")) {
    return "An account with that email already exists.";
  }
  if (code.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (code.includes("weak-password")) {
    return "Password is too weak — use at least 6 characters.";
  }
  if (
    code.includes("operation-not-allowed") ||
    code.includes("admin-restricted-operation")
  ) {
    return "Email/password sign-in is not enabled for this project. Enable it in Firebase Console → Authentication → Sign-in method.";
  }
  if (
    code.includes("configuration-not-found") ||
    code.includes("api-key-not-valid")
  ) {
    return "Firebase auth isn't configured. Check your .env.local values and that Authentication is enabled in the Firebase console.";
  }
  if (code.includes("network-request-failed")) {
    return "Network error — check your connection and try again.";
  }
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) {
    return "Google sign-in was cancelled.";
  }

  // Surface the raw Firebase code so unexpected failures are diagnosable.
  console.error("Signup error:", err);
  return `Could not create account${code ? ` (${code})` : ""}. Please try again.`;
}
