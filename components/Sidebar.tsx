"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Menu,
  ChevronLeft,
  LogOut
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

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
    { name: "Tenants", href: "/tenants", icon: Users },
    { name: "Add Tenant", href: "/add-tenant", icon: UserPlus }
  ];

  return (
    <div
      className={`h-screen bg-slate-900 text-white transition-all duration-200 ${collapsed ? "w-16" : "w-64"
        } hidden md:flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <span className="font-bold text-lg">
            PG Manager
          </span>
        )}

        <button
          onClick={() =>
            setCollapsed(!collapsed)
          }
        >
          {collapsed ? (
            <Menu size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-2">

        {navItems.map((item) => {

          const Icon = item.icon;

          const active =
            pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${active
                ? "bg-blue-600"
                : "hover:bg-slate-800"
                }`}
            >
              <Icon size={20} />

              {!collapsed &&
                item.name}
            </Link>
          );

        })}

      </nav>

      {/* Owner + logout */}
      <div className="p-2 border-t border-slate-800">
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-gray-400 truncate">
            {user.email}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-3 rounded-lg text-gray-300 hover:bg-slate-800 transition"
        >
          <LogOut size={20} />

          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}