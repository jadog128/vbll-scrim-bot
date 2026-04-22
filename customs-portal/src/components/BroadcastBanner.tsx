"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Megaphone, AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BroadcastBanner() {
    const { data } = useSWR('/api/broadcasts', fetcher, { refreshInterval: 30000 }); // Poll every 30s
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('dismissed_broadcasts');
        if (saved) {
            try { setDismissed(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const handleDismiss = (id: string) => {
        const newDismissed = [...dismissed, id];
        setDismissed(newDismissed);
        localStorage.setItem('dismissed_broadcasts', JSON.stringify(newDismissed));
    };

    if (!data?.broadcasts || data.broadcasts.length === 0) return null;

    const activeBroadcasts = data.broadcasts.filter((b: any) => !dismissed.includes(b.id));

    if (activeBroadcasts.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <AnimatePresence>
                {activeBroadcasts.map((b: any) => {
                    const isError = b.type === 'error';
                    const isSuccess = b.type === 'success';
                    const isWarning = b.type === 'warning';

                    const Icon = isError ? AlertCircle : isSuccess ? CheckCircle : isWarning ? Megaphone : Info;
                    const bgClass = isError ? 'bg-error/10 border-error/20' : isSuccess ? 'bg-green-500/10 border-green-500/20' : isWarning ? 'bg-orange-500/10 border-orange-500/20' : 'bg-primary/10 border-primary/20';
                    const textClass = isError ? 'text-error' : isSuccess ? 'text-green-600' : isWarning ? 'text-orange-600' : 'text-primary';

                    return (
                        <motion.div
                            key={b.id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`relative overflow-hidden rounded-[2rem] p-6 border-2 ${bgClass} flex items-start gap-4 shadow-ambient`}
                        >
                            <div className={`p-3 rounded-2xl bg-white/50 backdrop-blur-md shadow-sm ${textClass}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className={`text-lg font-black tracking-tight ${textClass}`}>{b.title}</h3>
                                <p className="text-sm font-medium text-on-surface-variant max-w-3xl">
                                    {b.message}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleDismiss(b.id)}
                                className={`p-2 rounded-xl hover:bg-white/50 transition-colors ${textClass}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
