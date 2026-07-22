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
        {
            name: "Home",
            href: "/",
            icon: LayoutDashboard
        },
        {
            name: "Rooms",
            href: "/rooms",
            icon: DoorOpen
        },
        {
            name: "Tenants",
            href: "/tenants",
            icon: Users
        },
        {
            name: "Add",
            href: "/add-tenant",
            icon: UserPlus
        },
        {
            name: "Reports",
            href: "/reports",
            icon: FileBarChart
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 md:hidden">

            {items.map((item) => {

                const Icon = item.icon;

                const active =
                    pathname === item.href;

                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex flex-col items-center text-xs ${active
                                ? "text-blue-500"
                                : "text-gray-400"
                            }`}
                    >
                        <Icon size={22} />
                        {item.name}
                    </Link>
                );

            })}

        </div>
    );
}
