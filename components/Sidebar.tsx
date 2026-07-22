"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  DoorOpen,
  FileBarChart,
  Menu,
  ChevronLeft,
  LogOut,
  Home
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AUTH_ENABLED } from "../lib/config";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Rooms", href: "/rooms", icon: DoorOpen },
    { name: "Tenants", href: "/tenants", icon: Users },
    { name: "Add Tenant", href: "/add-tenant", icon: UserPlus },
    { name: "Reports", href: "/reports", icon: FileBarChart }
  ];

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 hidden md:flex flex-col transition-all duration-200 ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)"
      }}
    >
      {/* Brand */}
      <div className="flex items-center justify-between p-4 h-16">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <span
              className="grid place-items-center h-9 w-9 rounded-xl text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))"
              }}
            >
              <Home size={18} />
            </span>
            <span className="font-bold text-[15px] tracking-tight">
              PG Manager
            </span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-ghost grid place-items-center h-9 w-9 rounded-lg"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                collapsed ? "justify-center" : ""
              }`}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.14))",
                      color: "#fff",
                      border: "1px solid rgba(99,102,241,0.35)"
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <Icon size={19} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Owner + logout (only when auth is enabled) */}
      {AUTH_ENABLED && (
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          {!collapsed && user && (
            <div className="px-2 pb-2 text-xs truncate" style={{ color: "var(--text-faint)" }}>
              {user.email}
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`btn btn-ghost w-full ${collapsed ? "px-0" : "justify-start"}`}
          >
            <LogOut size={18} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      )}
    </aside>
  );
}
