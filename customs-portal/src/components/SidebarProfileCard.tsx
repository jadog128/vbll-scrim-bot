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
    <div className="bg-white/40 rounded-[2.5rem] p-6 border border-white/50 animate-pulse h-64 mx-4"></div>
  );

  return (
    <div className="bg-white/40 rounded-[2.5rem] p-6 border border-white/50 space-y-6 shadow-sm mx-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-200 p-0.5 overflow-hidden">
             <img src={session.user.image || ""} alt="" className="w-full h-full rounded-full object-cover bg-emerald-100" />
        </div>
        <div>
           <div className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">Profile Status</div>
           <div className="text-sm font-bold text-on-surface">Verified Sync</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-on-surface-variant uppercase tracking-widest opacity-60">VRFS ID</span>
          <span className="font-black text-on-surface tracking-tight">#{stats.vrfsId}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Customs from VBLL</span>
          <span className="w-8 h-6 bg-surface-container-high rounded-full flex items-center justify-center font-black text-on-surface">
            {stats.totalCustoms}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-primary/5 space-y-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-800 opacity-60">Recent Approved</div>
        <div className="space-y-2">
          {stats.recentApproved?.map((r: any, i: number) => (
            <div key={i} className="bg-surface-container-lowest rounded-2xl p-3 border border-white hover:border-emerald-100 transition-all group">
               <div className="text-[10px] font-bold text-on-surface group-hover:text-primary mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{r.type}</div>
               <div className="text-[8px] font-medium text-on-surface-variant opacity-60">
                 {new Date(r.created_at).toLocaleDateString()}
               </div>
            </div>
          ))}
          {(!stats.recentApproved || stats.recentApproved.length === 0) && (
            <div className="text-[10px] text-on-surface-variant opacity-40 italic py-2">No past batches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
