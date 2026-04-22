"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import SidebarProfileCard from "./SidebarProfileCard";
import { Settings2, ArrowUp, ArrowDown, Check } from "lucide-react";
import { motion, Reorder, AnimatePresence } from "framer-motion";

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentGuildId = searchParams.get("guild");
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  
  const defaultLinks = [
    { id: "requests", name: "My Requests", href: "/dashboard", icon: "receipt_long" },
    { id: "inventory", name: "Inventory", href: "/inventory", icon: "inventory_2" },
    { id: "support", name: "Support Vault", href: "/support", icon: "shield" },
  ];

  const [links, setLinks] = useState(defaultLinks);

  // Load order and admin links
  useEffect(() => {
    let order: any[] = [];
    
    // Add admin links if applicable
    if ((session?.user as any)?.isAdmin) {
      order.push({ id: "admin", name: "Admin Dashboard", href: "/admin", icon: "dashboard_customize" });
      
      const guilds = (session?.user as any)?.manageableGuilds || [];
      if (guilds.length >= 1) {
        order.push({ id: "switch", name: "Switch League", href: "/admin/select", icon: "swap_horiz" });
      }
      
      order.push({ id: "bot", name: "Bot Designer", href: "/admin/bot-editor", icon: "robot_2" });
      order.push({ id: "logs", name: "Staff Logs", href: "/admin/logs", icon: "shield_person" });
      order.push({ id: "archive", name: "Batch Archive", href: "/admin/archive", icon: "history" });
    }

    // Merge with defaults
    const combined = [...order, ...defaultLinks];
    
    // Check local storage for custom order
    const saved = localStorage.getItem("sidebar_order");
    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        const sorted = combined.sort((a, b) => savedIds.indexOf(a.id) - savedIds.indexOf(b.id));
        setLinks(sorted);
      } catch {
        setLinks(combined);
      }
    } else {
      setLinks(combined);
    }
  }, [session]);

  const saveOrder = (newList: any[]) => {
    setLinks(newList);
    localStorage.setItem("sidebar_order", JSON.stringify(newList.map(l => l.id)));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
      const newList = [...links];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return;
      
      const [movedItem] = newList.splice(index, 1);
      newList.splice(targetIndex, 0, movedItem);
      saveOrder(newList);
  };

  return (
    <nav className="bg-[#f8f9f8] text-[#0b4633] w-72 h-full py-8 flex flex-col border-r border-outline-variant/10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] overflow-y-auto no-scrollbar relative">
      <div className="px-8 mb-10 flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-ambient">
          <span className="material-symbols-outlined icon-fill">hive</span>
        </div>
        <div>
          <h1 className="text-xl font-black text-primary tracking-tighter leading-none">Lucid Portal</h1>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1 opacity-60">Management</p>
        </div>
      </div>

      <div className="mb-8">
         <SidebarProfileCard />
      </div>

      <div className="flex-1 px-4 space-y-2">
        <AnimatePresence>
            {links.map((link, index) => {
              const isActive = pathname === link.href || (link.href === '/admin' && pathname.startsWith('/admin'));
              const isSwitchLink = link.name === "Switch League";
              const Component = isSwitchLink ? "a" : Link;
              
              const href = (link.href.startsWith("/admin") && !isSwitchLink && currentGuildId)
                ? `${link.href}?guild=${currentGuildId}`
                : link.href;
              
              return (
                <motion.div 
                    layout
                    key={link.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group relative"
                >
                    <Component 
                    href={href}
                    onClick={(e) => isEditing && e.preventDefault()}
                    className={`p-4 mx-2 flex items-center gap-4 rounded-3xl transition-all duration-300 ${
                        isActive 
                        ? "bg-white text-primary shadow-[0_8px_32px_rgba(0,0,0,0.06)] scale-[1.02] border border-white" 
                        : "text-on-surface-variant/70 hover:bg-white/50 hover:text-on-surface hover:translate-x-1"
                    } ${isEditing ? "opacity-50 pointer-events-none" : ""}`}
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

                    {isEditing && (
                        <div className="absolute right-4 inset-y-0 flex items-center gap-1">
                            <button onClick={() => moveItem(index, 'up')} className="p-1 hover:bg-primary/10 rounded-md text-primary"><ArrowUp className="w-3 h-3" /></button>
                            <button onClick={() => moveItem(index, 'down')} className="p-1 hover:bg-primary/10 rounded-md text-primary"><ArrowDown className="w-3 h-3" /></button>
                        </div>
                    )}
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      <div className="px-8 mt-auto pt-6 border-t border-primary/5 space-y-4">
        <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest ${
                isEditing ? "bg-primary text-black" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
        >
            {isEditing ? <Check className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            {isEditing ? "Finish Reorder" : "Reorder Sidebar"}
        </button>
        <div className="text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] text-center">
          VBLL Operations v1.3
        </div>
      </div>
    </nav>
  );
}

