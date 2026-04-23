"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Command, LayoutDashboard, Settings2, Users, Receipt, ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

const ACTIONS = [
    { id: "dash", name: "Jump to Dashboard", icon: LayoutDashboard, href: "/admin", category: "Navigation" },
    { id: "batch", name: "Batch Bot Designer", icon: Settings2, href: "/admin/bot-editor", category: "Management" },
    { id: "users", name: "Search User Directory", icon: Users, href: "/admin/users", category: "Management" },
    { id: "requests", name: "Audit & Oversight", icon: Receipt, href: "/admin/requests", category: "Audit" },
    { id: "tickets", name: "Support Tickets", icon: ShieldAlert, href: "/admin/tickets", category: "Support" },
];

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const searchParams = useSearchParams();
    const guildId = searchParams.get("guild");
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleOpen = useCallback(() => setIsOpen(open => !open), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === "k") {
                e.preventDefault();
                toggleOpen();
            }
            if (e.key === "Escape") setIsOpen(false);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleOpen]);

    const filteredActions = ACTIONS.filter(a => 
        a.name.toLowerCase().includes(query.toLowerCase()) || 
        a.category.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (href: string) => {
        const target = guildId ? `${href}?guild=${guildId}` : href;
        router.push(target);
        setIsOpen(false);
        setQuery("");
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        ref={containerRef}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-massive border border-white/20 overflow-hidden flex flex-col"
                    >
                        <div className="p-6 border-b border-secondary/5 flex items-center gap-4">
                            <Search className="w-5 h-5 text-on-surface-variant/40" />
                            <input 
                                autoFocus
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-on-surface placeholder:text-on-surface-variant/20"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                            />
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-container rounded-lg border border-outline-variant/10">
                                <span className="text-[10px] font-black opacity-30">ESC</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[400px] p-3 no-scrollbar">
                            {filteredActions.length > 0 ? (
                                <div className="space-y-4">
                                    {["Navigation", "Management", "Audit", "Support"].map(cat => {
                                        const catActions = filteredActions.filter(a => a.category === cat);
                                        if (catActions.length === 0) return null;
                                        return (
                                            <div key={cat} className="space-y-1">
                                                <h4 className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-30 mt-2 mb-1">{cat}</h4>
                                                {catActions.map((action) => (
                                                    <button
                                                        key={action.id}
                                                        onClick={() => handleSelect(action.href)}
                                                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/60 transition-all group text-left"
                                                    >
                                                        <div className="p-2.5 bg-surface-container rounded-xl text-on-surface-variant/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                            <action.icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-black text-on-surface">{action.name}</div>
                                                            <div className="text-[10px] text-on-surface-variant font-medium opacity-60">Execute {cat.toLowerCase()} trigger</div>
                                                        </div>
                                                        <Command className="w-4 h-4 opacity-0 group-hover:opacity-10 transition-opacity" />
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-surface-container rounded-3xl mx-auto flex items-center justify-center">
                                        <Search className="w-8 h-8 text-on-surface-variant/20" />
                                    </div>
                                    <p className="text-sm font-bold text-on-surface-variant opacity-40 uppercase tracking-widest text-[10px]">No commands found for "{query}"</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-surface-container-low/50 border-t border-secondary/5 flex items-center justify-between text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5 font-black text-primary/60">ALT+K</span>
                                <span className="flex items-center gap-1.5"><Command className="w-3 h-3" /> Select</span>
                                <span className="flex items-center gap-1.5"><X className="w-3 h-3" /> Close</span>
                            </div>
                            <span className="opacity-20 italic">v2.0 HUD Interface</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
