"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StaffActivity {
    discord_id: string;
    username: string;
    avatar_url: string;
    last_active: string;
    status: string;
}

export default function ActiveStaffList() {
    const [staff, setStaff] = useState<StaffActivity[]>([]);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await fetch("/api/staff/activity");
                const data = await res.json();
                if (Array.isArray(data)) setStaff(data);
            } catch (e) {}
        };

        fetchStaff();
        const interval = setInterval(fetchStaff, 60000); // Pulse every minute
        return () => clearInterval(interval);
    }, []);

    if (staff.length === 0) return null;

    return (
        <div className="px-8 mt-6">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant opacity-30 mb-4">Live Staff Feed</h4>
            <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                    {staff.map((s) => (
                        <motion.div
                            key={s.discord_id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            layout
                            className="flex items-center gap-3 p-2 pr-4 bg-white/40 rounded-2xl border border-white/20 transition-all hover:bg-white/80 group"
                        >
                            <div className="relative">
                                <img 
                                    src={s.avatar_url || "/default-avatar.png"} 
                                    alt={s.username} 
                                    className="w-10 h-10 rounded-xl"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00f5a0] rounded-full border-4 border-surface shadow-[0_0_12px_#00f5a0]" />
                                <div className="absolute inset-0 rounded-xl border-2 border-[#00f5a0]/40 group-hover:animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-on-surface leading-none truncate">{s.username}</p>
                                <p className="text-[8px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mt-1">Active</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            {/* Ambient Glow Decoration */}
            <div className="absolute left-0 bottom-32 w-1 h-24 bg-gradient-to-b from-transparent via-[#00f5a0]/20 to-transparent blur-md" />
        </div>
    );
}
