"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentGuildId = searchParams.get("guild");
  const { data: session } = useSession();

  const links = [
    { name: "Support", href: "/support", icon: "shield" },
    { name: "Requests", href: "/dashboard", icon: "receipt_long" },
    { name: "Inventory", href: "/inventory", icon: "inventory_2" },
  ];

  if ((session?.user as any)?.isAdmin) {
    links.unshift({ name: "Admin", href: "/admin", icon: "dashboard_customize" });
    links.push({ name: "Logs", href: "/admin/logs", icon: "shield_person" });
    links.push({ name: "Archive", href: "/admin/archive", icon: "history" });
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex items-center px-4 pb-8 pt-3 bg-white/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(11,70,51,0.06)] rounded-t-[2.5rem] overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 mx-auto">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href === '/admin' && pathname.startsWith('/admin'));
            
            const href = (link.href.startsWith("/admin") && currentGuildId)
                ? `${link.href}?guild=${currentGuildId}`
                : link.href;

            return (
              <Link 
                key={link.name} 
                href={href}
                className={`flex flex-col items-center justify-center transition-all px-4 py-2.5 min-w-[70px] ${
                  isActive 
                    ? "text-primary bg-primary/5 rounded-[1.25rem] scale-105" 
                    : "text-on-surface-variant opacity-60"
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? "bg-primary/10" : ""}`}>
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? "icon-fill" : ""}`}>
                    {link.icon}
                    </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest mt-1">
                  {link.name}
                </span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}

