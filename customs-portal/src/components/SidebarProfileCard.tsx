"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function SidebarProfileCard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/profile")
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(() => {});
    }
  }, [session]);

  if (!session?.user || !stats) return (
    <div className="bg-white/40 rounded-[2.5rem] p-6 border border-white/50 animate-pulse h-64 mx-6"></div>
  );

  return (
    <div className="bg-white/40 rounded-[2.5rem] p-6 border border-white/50 space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.02)] mx-6 transition-all hover:shadow-ambient group">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl border-2 border-emerald-100 p-0.5 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
             <img src={session.user.image || ""} alt="" className="w-full h-full rounded-[14px] object-cover bg-emerald-50" />
        </div>
        <div>
           <div className="text-[10px] font-black uppercase tracking-[0.15em] text-primary opacity-60">Profile Status</div>
           <div className="text-sm font-black text-on-surface tracking-tight">Verified Sync</div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">VRFS ID</span>
          <span className="text-xs font-black text-on-surface tracking-tighter">#{stats.vrfsId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">Customs</span>
          <span className="px-2.5 py-1 bg-surface-container-high rounded-full font-black text-[10px] text-on-surface shadow-sm">
            {stats.totalCustoms}
          </span>
        </div>
      </div>

      <div className="pt-5 border-t border-primary/5 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800 opacity-60 flex items-center gap-2">
           <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
           Recent Activity
        </div>
        <div className="space-y-2">
          {stats.recentApproved?.map((r: any, i: number) => (
            <div key={i} className="bg-white/60 rounded-2xl p-3 border border-white hover:border-emerald-100 transition-all hover:translate-x-1">
               <div className="text-[10px] font-black text-on-surface mb-0.5 truncate">{r.type}</div>
               <div className="text-[8px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">
                 {new Date(r.created_at).toLocaleDateString()}
               </div>
            </div>
          ))}
          {(!stats.recentApproved || stats.recentApproved.length === 0) && (
            <div className="text-[10px] text-on-surface-variant/40 italic py-2 px-4 text-center bg-black/5 rounded-xl border border-dashed border-black/5">No activity detected</div>
          )}
        </div>
      </div>
    </div>
  );
}
