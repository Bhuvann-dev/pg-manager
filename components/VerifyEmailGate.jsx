"use client";

import { useEffect, useState } from "react";
import { MailCheck, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { friendlyAuthError } from "../lib/authErrors";

/*
Shown by AppShell when a signed-in owner hasn't verified their email yet.
Blocks the app, explains what's needed, lets them resend the link, and
auto-detects when verification completes (polling + a manual button). Once
verified, AppShell re-renders into the app on its own.
*/

export default function VerifyEmailGate() {
  const { user, resendVerification, refreshUser, logout } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  // Auto-detect: poll for verification done elsewhere.
  useEffect(() => {
    const id = setInterval(() => {
      refreshUser().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
    // refreshUser is stable enough (reads live auth.currentUser); poll once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    setBusy(true);
    try {
      await resendVerification();
      toast("Verification email sent — check your inbox.", "success");
    } catch (err) {
      toast(friendlyAuthError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = async () => {
    setBusy(true);
    try {
      const verified = await refreshUser();
      if (!verified) {
        toast("Not verified yet — click the link in your email.", "error");
      }
      // If verified, AppShell re-renders into the app automatically.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8 text-center">
        <span
          className="grid place-items-center h-12 w-12 rounded-lg text-white mx-auto mb-4"
          style={{ background: "var(--accent)" }}
          aria-hidden="true"
        >
          <MailCheck size={22} />
        </span>

        <h1 className="text-xl font-bold mb-1">Verify your email</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          We sent a verification link to{" "}
          <strong>{user?.email}</strong>. Click it, then continue — this page
          updates automatically once you&apos;re verified.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleContinue}
            disabled={busy}
            className="btn btn-primary w-full"
          >
            I&apos;ve verified — continue
          </button>

          <button
            onClick={handleResend}
            disabled={busy}
            className="btn btn-secondary w-full"
          >
            Resend email
          </button>

          <button onClick={() => logout()} className="btn btn-ghost w-full">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
