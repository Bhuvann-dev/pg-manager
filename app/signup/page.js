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
      <div className="w-full max-w-sm bg-slate-900 p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-gray-400 text-sm mb-6">
          Start managing your PG in minutes.
        </p>

        {error && (
          <p className="bg-red-900/40 text-red-300 text-sm p-3 rounded-lg mb-4">
            {error}
          </p>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Confirm Password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full mt-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 transition p-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5 text-gray-500 text-sm">
          <div className="h-px flex-1 bg-slate-700" />
          or
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition p-3 rounded-lg font-medium disabled:opacity-60"
        >
          Continue with Google
        </button>

        <p className="text-sm text-gray-400 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
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
