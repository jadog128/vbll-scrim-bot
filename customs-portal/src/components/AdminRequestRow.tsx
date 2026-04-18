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
    <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10 flex items-center justify-between group hover:border-primary/20 transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            status === 'completed' ? 'bg-primary/10 text-primary' : 
            status === 'rejected' ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'
        }`}>
            {status === 'completed' ? <Check className="w-5 h-5" /> : 
             status === 'rejected' ? <X className="w-5 h-5" /> : <Package className="w-5 h-5" />}
        </div>
        <div>
          <div className="font-bold text-on-surface flex items-center gap-2">
            {request.username}
            <span className="text-[10px] font-black opacity-30">#{request.id}</span>
          </div>
          <div className="text-xs text-on-surface-variant/60 font-medium">{request.type} — {request.vrfs_id}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status === 'pre_review' && (
          <>
            <button 
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
              title="Approve to Queue"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleAction('deny')}
              disabled={loading}
              className="p-2 rounded-xl bg-error/10 text-error hover:bg-error hover:text-white transition-all"
              title="Reject"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
        
        {status === 'pending' && (
          <button 
            onClick={() => handleAction('fulfill')}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary hover:text-white font-bold text-xs transition-all flex items-center gap-2"
          >
            <Package className="w-4 h-4" /> Fulfill
          </button>
        )}

        <a 
          href={request.proof_url} 
          target="_blank" 
          rel="noreferrer"
          className="p-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-on-surface hover:text-surface transition-all"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
