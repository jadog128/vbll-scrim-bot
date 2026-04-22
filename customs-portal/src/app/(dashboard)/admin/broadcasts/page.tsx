"use client";

import { useState, Suspense } from "react";
import { Megaphone, AlertCircle, CheckCircle, Info, Send, Trash2, Loader2, Plus, ArrowLeft } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BroadcastsAdminPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center animate-pulse">Loading Dashboard...</div>}>
            <BroadcastsAdminContent />
        </Suspense>
    );
}

function BroadcastsAdminContent() {
    const { data, mutate } = useSWR('/api/broadcasts', fetcher);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("info");
    const router = useRouter();

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/broadcasts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message, type })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            
            toast.success("Broadcast dispatched globally!");
            setTitle("");
            setMessage("");
            setType("info");
            mutate();
        } catch (error: any) {
            toast.error(error.message || "Failed to create broadcast");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/broadcasts?id=${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.error) throw new Error(result.error);
            toast.success("Broadcast removed");
            mutate();
        } catch (error: any) {
            toast.error(error.message || "Failed to remove broadcast");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-3 bg-surface-container-high rounded-xl hover:bg-surface-container-highest transition-colors">
                    <ArrowLeft className="w-5 h-5 text-on-surface" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-on-surface tracking-tighter flex items-center gap-3">
                        <Megaphone className="text-secondary w-8 h-8" />
                        Global Broadcasts
                    </h1>
                    <p className="text-sm font-medium text-on-surface-variant">Send real-time announcements to all user dashboards.</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-ambient border border-white">
                <form onSubmit={handleCreate} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <label className="text-xs font-black uppercase text-on-surface-variant tracking-widest pl-2">Broadcast Title</label>
                            <input 
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. System Maintenance"
                                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-3 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all placeholder:font-normal placeholder:text-on-surface-variant/40"
                            />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <label className="text-xs font-black uppercase text-on-surface-variant tracking-widest pl-2">Severity Type</label>
                            <select 
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-3 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
                            >
                                <option value="info">Info (Blue)</option>
                                <option value="warning">Warning (Orange)</option>
                                <option value="success">Success (Green)</option>
                                <option value="error">Critical (Red)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-on-surface-variant tracking-widest pl-2">Message Body</label>
                        <textarea 
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                            placeholder="Detailed announcement text..."
                            className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-3 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all placeholder:font-normal placeholder:text-on-surface-variant/40 resize-none"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-secondary text-white rounded-2xl shadow-lg shadow-secondary/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-secondary/90 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Dispatch Broadcast
                        </button>
                    </div>
                </form>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-black text-on-surface tracking-tight px-2">Active Broadcasts</h2>
                
                {!data ? (
                    <div className="p-8 text-center text-on-surface-variant animate-pulse font-black">Loading active broadcasts...</div>
                ) : data.broadcasts?.length === 0 ? (
                    <div className="bg-surface-container-low/20 rounded-[2.5rem] border-2 border-dashed border-outline-variant/10 p-12 text-center text-on-surface-variant/50 font-black tracking-widest uppercase">
                        No active broadcasts
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {data.broadcasts.map((b: any) => {
                            const isError = b.type === 'error';
                            const isSuccess = b.type === 'success';
                            const isWarning = b.type === 'warning';
                            const Icon = isError ? AlertCircle : isSuccess ? CheckCircle : isWarning ? Megaphone : Info;
                            const textClass = isError ? 'text-error' : isSuccess ? 'text-green-600' : isWarning ? 'text-orange-600' : 'text-primary';

                            return (
                                <div key={b.id} className="bg-white rounded-3xl p-6 shadow-sm border border-outline-variant/5 flex items-start gap-4">
                                     <div className={`p-3 rounded-2xl bg-surface-container-low ${textClass}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className={`text-lg font-black tracking-tight ${textClass}`}>{b.title}</h3>
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-surface-container-high rounded-md text-on-surface-variant">
                                                {new Date(b.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-on-surface-variant">
                                            {b.message}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(b.id)}
                                        className="p-3 text-error/40 hover:text-error hover:bg-error/10 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
