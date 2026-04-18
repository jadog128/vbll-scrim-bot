"use client";

import { useState } from "react";
import { Check, X, Package, ExternalLink } from "lucide-react";

interface Props {
  request: any;
}

export default function AdminRequestRow({ request }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(request.status);

  async function handleAction(action: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/requests/action", {
        method: "POST",
        body: JSON.stringify({ requestId: request.id, action }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        if (action === "approve") setStatus("pending");
        if (action === "deny") setStatus("rejected");
        if (action === "fulfill") setStatus("completed");
      }
    } catch (e) {}
    setLoading(false);
  }

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-ambient border border-white hover:border-primary/20 transition-all group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant group-hover:bg-primary/5 group-hover:text-primary transition-colors">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-on-surface">{request.username}</span>
                <span className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest">#{request.id}</span>
            </div>
            <div className="text-[10px] font-medium text-on-surface-variant flex items-center gap-2 mt-0.5">
               <span className="capitalize">{request.type}</span>
               <span className="opacity-40">—</span>
               <span className="truncate max-w-[150px]">{request.vrfs_id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-surface-container-high text-on-surface-variant'
            }`}>
                {status}
            </div>
          <a href={request.proof_url} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-surface-container-high hover:bg-primary/10 hover:text-primary transition-all">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
