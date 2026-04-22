"use client";

import { useState, Suspense } from "react";
import { Users, Search, AlertCircle, Loader2, ArrowLeft, MoreVertical, ShieldAlert } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function UserManagementPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center animate-pulse">Loading Directory...</div>}>
            <UserManagementContent />
        </Suspense>
    );
}

function UserManagementContent() {
    const [query, setQuery] = useState("");

    
    // Auto-fetch when query changes, only if > 2 chars
    const { data, isValidating, error } = useSWR(
        query.length > 2 ? `/api/admin/users/search?q=${encodeURIComponent(query)}` : null, 
        fetcher,
        { revalidateOnFocus: false }
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-3 bg-surface-container-high rounded-xl hover:bg-surface-container-highest transition-colors">
                        <ArrowLeft className="w-5 h-5 text-on-surface" />
                    </Link>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-on-surface tracking-tighter flex items-center gap-3">
                            <Users className="text-primary w-8 h-8" />
                            User Directory
                        </h1>
                        <p className="text-sm font-medium text-on-surface-variant">Search and manage requester profiles.</p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <Search className="w-6 h-6 text-on-surface-variant/40" />
                </div>
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by Discord ID or Username..."
                    className="w-full bg-white border border-outline-variant/10 rounded-3xl py-6 pl-16 pr-6 text-lg font-bold text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-ambient"
                />
            </div>

            <div className="space-y-4">
                {query.length > 0 && query.length < 3 && (
                    <p className="text-on-surface-variant font-medium text-center py-10 tracking-widest uppercase text-[10px]">Type at least 3 characters to search</p>
                )}

                {isValidating && (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse space-y-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Scanning Database...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-error/10 rounded-[2.5rem] border-2 border-dashed border-error/20 p-16 text-center space-y-4">
                         <AlertCircle className="w-12 h-12 text-error mx-auto" />
                         <h3 className="text-xl font-black text-error">Search Error</h3>
                         <p className="text-sm text-on-surface-variant font-medium">{error.message || "Failed to query the user database"}</p>
                    </div>
                )}

                {data && !isValidating && !error && data.users?.length === 0 && (
                    <div className="bg-surface-container-low/20 rounded-[2.5rem] border-2 border-dashed border-outline-variant/10 p-16 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-on-surface-variant/30 mx-auto" />
                        <h3 className="text-xl font-black text-on-surface-variant">No users found</h3>
                        <p className="text-sm text-on-surface-variant/70 font-medium tracking-widest uppercase">Try a different search term</p>
                    </div>
                )}


                {data && data.users?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.users.map((user: any) => (
                            <div key={user.discord_id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-outline-variant/5 flex flex-col justify-between hover:shadow-ambient hover:-translate-y-1 transition-all">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-xl font-black tracking-tight text-on-surface break-words">{user.username}</h3>
                                        <p className="text-[10px] font-black uppercase text-on-surface-variant/60 tracking-widest">ID: {user.discord_id}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-bold text-lg border-2 border-surface-container">
                                        {user.username ? user.username.charAt(0).toUpperCase() : "?"}
                                    </div>
                                </div>

                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10">
                                            <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-1">Total Requests</p>
                                            <p className="text-lg font-black text-primary">{user.total_requests}</p>
                                        </div>
                                        <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10">
                                            <p className="text-[9px] font-black uppercase text-on-surface-variant tracking-[0.2em] mb-1">Last Active</p>
                                            <p className="text-xs font-bold text-on-surface mt-1.5">{new Date(user.last_request_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button className="flex-1 bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface text-[10px] font-black uppercase tracking-widest py-2 rounded-xl flex items-center justify-center gap-2">
                                            View Logs
                                        </button>
                                        <button className="p-2 bg-error/10 text-error hover:bg-error hover:text-white rounded-xl transition-colors">
                                            <ShieldAlert className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
