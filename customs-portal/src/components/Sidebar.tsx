"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { name: "My Requests", href: "/dashboard", icon: "receipt_long" },
  ];

  if ((session?.user as any)?.isAdmin) {
    links.unshift({ name: "Admin Dashboard", href: "/admin", icon: "dashboard_customize" });
  }

  return (
    <nav className="bg-[#f3f4f3] text-[#0b4633] w-72 h-full py-6 flex flex-col space-y-2 border-r border-outline-variant/10">
      {/* Header */}
      <div className="px-6 mb-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-ambient">
          <span className="material-symbols-outlined icon-fill">hive</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary tracking-tight">VBLL Portal</h1>
          <p className="text-sm text-on-surface-variant font-medium">Request Management</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-2 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`p-3 mx-2 flex items-center gap-3 rounded-xl transition-all ${
                isActive 
                  ? "bg-white text-primary shadow-sm font-semibold" 
                  : "text-on-surface-variant hover:translate-x-1 hover:bg-white/50"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? "icon-fill" : ""}`}>
                {link.icon}
              </span>
              <span className="text-sm">{link.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Links */}
      <div className="px-2 mt-auto pt-4 space-y-1 text-xs font-medium text-on-surface-variant uppercase tracking-widest text-center opacity-40">
        VBLL Operations v1.0
      </div>
    </nav>
  );
}
