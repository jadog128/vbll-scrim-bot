"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Overview", href: "/dashboard", icon: "analytics" },
    { name: "Requests", href: "/dashboard/history", icon: "stacks" },
    { name: "Submit", href: "/dashboard/new", icon: "add_box" },
    { name: "Admin", href: "/admin", icon: "shield_person", adminOnly: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-3 bg-white/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(11,70,51,0.06)] rounded-t-[2rem]">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link 
            key={tab.href} 
            href={tab.href}
            className={`flex flex-col items-center justify-center transition-all ${
              isActive 
                ? "text-primary bg-surface-variant rounded-2xl px-5 py-2 scale-105" 
                : "text-on-surface-variant opacity-60"
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? "icon-fill" : ""}`}>
              {tab.icon}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest mt-1 hidden md:block">
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
