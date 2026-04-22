"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import SidebarProfileCard from "./SidebarProfileCard";

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentGuildId = searchParams.get("guild");
  const { data: session } = useSession();

  const links = [
    { name: "My Requests", href: "/dashboard", icon: "receipt_long" },
    { name: "Inventory", href: "/inventory", icon: "inventory_2" },
    { name: "Support Vault", href: "/support", icon: "shield" },
  ];


  if ((session?.user as any)?.isAdmin) {
    links.unshift({ name: "Admin Dashboard", href: "/admin", icon: "dashboard_customize" });
    
    // Check if user has multiple guilds to switch between
    const guilds = (session?.user as any)?.manageableGuilds || [];
    if (guilds.length >= 1) {
      links.push({ name: "Switch League", href: "/admin/select", icon: "swap_horiz" }); // Point to dedicated selector
    }
    
    links.push({ name: "Staff Logs", href: "/admin/logs", icon: "shield_person" });
    links.push({ name: "Batch Archive", href: "/admin/archive", icon: "history" });
  }

  return (
    <nav className="bg-[#f8f9f8] text-[#0b4633] w-72 h-full py-8 flex flex-col border-r border-outline-variant/10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="px-8 mb-10 flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-ambient transition-transform hover:scale-105 active:scale-95">
          <span className="material-symbols-outlined icon-fill">hive</span>
        </div>
        <div>
          <h1 className="text-xl font-black text-primary tracking-tighter leading-none">Lucid Portal</h1>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1 opacity-60">Management</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="mb-8">
         <SidebarProfileCard />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          // Check if exactly this path or if it's a subpath of admin
          const isActive = pathname === link.href || (link.href === '/admin' && pathname.startsWith('/admin'));
          
          const isSwitchLink = link.name === "Switch League";
          const Component = isSwitchLink ? "a" : Link;
          
          // Append guild param to admin links if we have one
          const href = (link.href.startsWith("/admin") && !isSwitchLink && currentGuildId)
            ? `${link.href}?guild=${currentGuildId}`
            : link.href;
          
          return (
            <Component 
              key={link.name} 
              href={href}
              className={`p-4 mx-2 flex items-center gap-4 rounded-3xl transition-all duration-300 group ${
                isActive 
                  ? "bg-white text-primary shadow-[0_8px_32px_rgba(0,0,0,0.06)] scale-[1.02] border border-white" 
                  : "text-on-surface-variant/70 hover:bg-white/50 hover:text-on-surface hover:translate-x-1"
              }`}
            >
              <div className={`p-2 rounded-xl transition-colors ${isActive ? "bg-primary/5 text-primary" : "text-on-surface-variant/40 group-hover:text-primary/40"}`}>
                <span className={`material-symbols-outlined text-[22px] block ${isActive ? "icon-fill" : ""}`}>
                  {link.icon}
                </span>
              </div>
              <span className={`text-sm tracking-tight ${isActive ? "font-black" : "font-semibold"}`}>
                {link.name}
              </span>
            </Component>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-8 mt-auto pt-6 border-t border-primary/5">
        <div className="text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] text-center">
          VBLL Operations v1.2
        </div>
      </div>
    </nav>
  );
}
