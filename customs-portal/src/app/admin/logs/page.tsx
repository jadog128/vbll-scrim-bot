"use client";

import { useEffect, useState } from "react";
import { Shield, Clock, User, Info, Activity, ChevronRight } from "lucide-react";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes("APPROVED")) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (action.includes("REJECTED")) return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    if (action.includes("EDITED") || action.includes("WEB_EDIT")) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-on-surface tracking-tightest leading-none mb-3">Audit Feed</h1>
          <p className="text-on-surface-variant font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Live trail of administrative operations and staff decisions.
          </p>
        </div>
        <div className="px-4 py-2 bg-white rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Monitoring Active</span>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-[2rem] border border-outline-variant/5 animate-pulse" />
            ))}
          </div>
        ) : logs.length > 0 ? (
          logs.map((log: any) => (
            <div key={log.id} className="group bg-white rounded-[2rem] p-6 border border-white hover:border-primary/20 shadow-sm hover:shadow-ambient transition-all flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center text-on-surface-variant group-hover:bg-primary/5 group-hover:text-primary transition-colors shrink-0">
                <span className="text-[10px] font-black leading-none">{new Date(log.created_at).toLocaleDateString(undefined, { month: 'short' })}</span>
                <span className="text-xl font-black leading-tight">{new Date(log.created_at).getDate()}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                   <h4 className="font-bold text-on-surface truncate">{log.staff_name}</h4>
                   <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getActionColor(log.action)}`}>
                      {log.action.replace('_', ' ')}
                   </span>
                </div>
                <p className="text-sm font-medium text-on-surface-variant line-clamp-1">
                   Target: <span className="font-bold text-on-surface">#{log.target_id}</span> • {log.details}
                </p>
              </div>

              <div className="text-right shrink-0">
                 <div className="text-[11px] font-black text-on-surface-variant opacity-30 flex items-center gap-1.5 justify-end">
                    <Clock className="w-3 h-3" />
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </div>
              </div>
              
              <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-on-surface-variant/20 group-hover:text-primary transition-colors">
                 <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-outline-variant/10">
            <div className="w-20 h-20 bg-surface-container-low rounded-3xl flex items-center justify-center text-on-surface-variant/20 mx-auto mb-6">
               <Shield className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-on-surface mb-2 tracking-tight">No Events Logged</h3>
            <p className="text-on-surface-variant font-medium max-w-xs mx-auto">
              Staff actions will appear here automatically as they happen on the bot or portal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
