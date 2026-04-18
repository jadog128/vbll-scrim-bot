"use client";

import { useEffect, useState } from "react";
import { Archive, Package, CheckCircle, ExternalLink } from "lucide-react";

export default function AdminArchivePage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/archive")
      .then(res => res.json())
      .then(data => {
        setBatches(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter">Batch Archive</h1>
        <p className="text-on-surface-variant font-medium">History of all successfully sent batches.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {batches.map((batch: any) => (
          <div key={batch.id} className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-ambient transition-all group">
             <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                   <Package className="w-6 h-6" />
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-black uppercase tracking-widest text-primary">Batch #{batch.id}</div>
                   <div className="text-[11px] font-bold text-on-surface-variant opacity-60">Sent {new Date(batch.released_at).toLocaleDateString()}</div>
                </div>
             </div>

             <div className="flex items-center gap-2 mb-8">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-on-surface">STATUS: SENT</span>
             </div>

             <div className="pt-6 border-t border-primary/5">
                <button className="w-full py-3 bg-surface-container-low rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white border border-transparent hover:border-primary/20 transition-all flex items-center justify-center gap-2">
                   View Contents <ExternalLink className="w-3 h-3" />
                </button>
             </div>
          </div>
        ))}

        {batches.length === 0 && !loading && (
          <div className="col-span-full py-32 text-center text-on-surface-variant/40 italic bg-white/40 rounded-[3rem] border-2 border-dashed border-outline-variant/10">
             No archived batches yet.
          </div>
        )}
      </div>
    </div>
  );
}
