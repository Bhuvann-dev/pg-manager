"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    DoorOpen,
    Users,
    UserPlus,
    FileBarChart
} from "lucide-react";

export default function MobileNav() {
    const pathname = usePathname();

    const items = [
        { name: "Home", href: "/", icon: LayoutDashboard },
        { name: "Rooms", href: "/rooms", icon: DoorOpen },
        { name: "Tenants", href: "/tenants", icon: Users },
        { name: "Add", href: "/add-tenant", icon: UserPlus },
        { name: "Reports", href: "/reports", icon: FileBarChart }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 p-3">
            <div
                className="flex justify-around items-center rounded-2xl px-1 py-1.5"
                style={{
                    background: "rgba(18, 26, 43, 0.85)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 8px 30px -10px rgba(0,0,0,0.7)"
                }}
            >
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition"
                            style={
                                active
                                    ? {
                                          color: "#fff",
                                          background:
                                              "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))"
                                      }
                                    : { color: "var(--text-faint)" }
                            }
                        >
                            <Icon size={20} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
