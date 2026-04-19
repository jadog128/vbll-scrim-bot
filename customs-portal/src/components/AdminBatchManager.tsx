"use client";

import { useState } from "react";
import { Package, X, Trash2, ArrowUpRight, UserPlus, RefreshCw, Loader2 } from "lucide-react";

export default function AdminBatchManager({ batch }: { batch: any }) {
  const [loading, setLoading] = useState(false);

  const handleRemoveMember = async (requestId: number) => {
    if (!confirm("Remove player from this batch and return them to the general queue?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/requests/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: requestId, 
          batch_id: "", // Clear batch
          status: "pending" // Reset to pending
        })
      });
      if (res.ok) window.location.reload();
      else alert("Action failed");
    } catch(e) { alert("Error removing member"); }
    setLoading(false);
  };

  const handleWaterfall = async () => {
    setLoading(true);
    try {
      // We call our update API but with a special flag or just trigger reorder
      // Or we can just call the bot directly if we had a dedicated API, 
      // but let's just trigger a reorder via any request update or a new dedicated internal API.
      
      // I'll create /api/admin/batches/reorder for convenience
      const res = await fetch("/api/admin/batches/reorder", { method: "POST" });
      if (res.ok) window.location.reload();
      else {
        const data = await res.json().catch(() => ({}));
        alert(`Reorder failed: ${data.error || "Bot unreachable. Check BOT_SERVER_IP env var."}`);
      }
    } catch(e) { alert("Error"); }
    setLoading(false);
  };

  return (
    <div className={`bg-white rounded-[2.5rem] p-8 shadow-ambient border border-outline-variant/10 relative overflow-hidden transition-all ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-on-surface">Batch #{batch.id}</h3>
            <div className="flex items-center gap-2">
               <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                 batch.status === 'open' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
               }`}>
                 {batch.status}
               </span>
               <span className="text-[10px] font-bold text-on-surface-variant/40">• {batch.requests.length}/8 Slots Filled</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleWaterfall}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-2xl text-[10px] font-black uppercase text-on-surface-variant hover:text-primary transition-colors"
          title="Fill gaps from other batches"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Re-Stack
        </button>
      </div>

      <div className="space-y-3">
        {batch.requests.map((req: any) => (
          <div key={req.id} className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5 hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-4 truncate">
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-black text-on-surface-variant">
                {req.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="truncate">
                 <div className="text-sm font-bold text-on-surface truncate">{req.username}</div>
                 <div className="text-[10px] font-medium text-on-surface-variant/60 tracking-tight">{req.type} • {req.vrfs_id}</div>
              </div>
            </div>
            
            <button 
              onClick={() => handleRemoveMember(req.id)}
              className="p-2 text-on-surface-variant/20 hover:text-error hover:bg-error/5 rounded-xl transition-all"
              title="Remove from batch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {Array.from({ length: 8 - batch.requests.length }).map((_, i) => (
          <div key={i} className="h-14 border border-dashed border-outline-variant/20 rounded-2xl flex items-center justify-center text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-widest">
            Empty Slot
          </div>
        ))}
      </div>
    </div>
  );
}
