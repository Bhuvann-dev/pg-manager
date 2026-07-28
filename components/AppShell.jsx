"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { AUTH_ENABLED } from "../lib/config";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import ThemeToggle from "./ThemeToggle";

/*
AppShell — client-side route protection + layout.

- Auth pages (/login, /signup) render bare, with no nav and no guard.
- Every other route requires a signed-in owner; unauthenticated users
  are redirected to /login. The real data protection is the security
  rules (docs/decisions.md ADR-006) — this guard is UX.
*/

const PUBLIC_ROUTES = ["/login", "/signup"];

export default function AppShell({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (AUTH_ENABLED && !loading && !user && !isPublicRoute) {
      router.replace("/login");
    }
  }, [loading, user, isPublicRoute, router]);

  // Auth pages: no nav shell, no guard.
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Resolving the session, or about to redirect an unauthenticated user.
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  // Authenticated app.
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      {/* Floating settings + theme toggle for mobile (sidebar hosts these on desktop) */}
      <div className="md:hidden fixed top-3 right-3 z-40 flex items-center gap-2">
        <Link
          href="/settings"
          aria-label="Settings"
          className="card grid place-items-center h-10 w-10"
        >
          <Settings size={18} />
        </Link>
        <div className="card p-0.5">
          <ThemeToggle />
        </div>
      </div>

      <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <MobileNav />
    </div>
  );
}
