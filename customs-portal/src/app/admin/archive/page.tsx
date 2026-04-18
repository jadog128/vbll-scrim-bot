"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle, ExternalLink, Archive, Calendar, Users, BarChart3 } from "lucide-react";

export default function AdminArchivePage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/archive")
      .then(res => res.json())
      .then(data => {
        setBatches(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-12 py-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="w-16 h-16 rounded-[2rem] bg-primary/5 flex items-center justify-center text-primary mb-6">
             <Archive className="w-8 h-8" />
          </div>
          <h1 className="text-5xl font-black text-on-surface tracking-tightest leading-none mb-4">Historical Archives</h1>
          <p className="text-lg font-medium text-on-surface-variant leading-relaxed">
            Archive of all fulfilled and closed batches. These are batches that have been successfully deployed in-game.
          </p>
        </div>
        
        <div className="flex gap-4">
           <div className="px-6 py-4 bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-1">Total Batches</div>
              <div className="text-2xl font-black text-on-surface">{batches.length}</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-[3rem] border border-outline-variant/5 animate-pulse" />)
        ) : batches.length > 0 ? (
          batches.map((batch: any) => (
            <div key={batch.id} className="group relative bg-white rounded-[3rem] p-10 border border-white hover:border-primary/20 shadow-sm hover:shadow-ambient transition-all overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[5rem] translate-x-12 -translate-y-12 group-hover:scale-125 transition-transform duration-700" />
               
               <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                     <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                        Batch #{batch.id}
                     </span>
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                     </div>
                  </div>

                  <h3 className="text-2xl font-black text-on-surface mb-8 tracking-tight">Full Batch Fulfill</h3>

                  <div className="space-y-4 mb-10">
                     <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm">Sent: {new Date(batch.released_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                     </div>
                     <div className="flex items-center gap-3 text-on-surface-variant font-medium">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm">8 Requests Fulfilled</span>
                     </div>
                  </div>

                  <button className="w-full py-4 bg-surface-container-low rounded-[1.5rem] text-xs font-black uppercase tracking-widest text-on-surface hover:bg-primary hover:text-white border border-transparent transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm">
                     Inspect Details <ExternalLink className="w-4 h-4" />
                  </button>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-40 text-center bg-white rounded-[4rem] border-2 border-dashed border-outline-variant/10">
            <div className="w-24 h-24 bg-surface-container-low rounded-[2rem] flex items-center justify-center text-on-surface-variant/10 mx-auto mb-8">
               <Package className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-on-surface mb-3 tracking-tight">No Archived Batches</h3>
            <p className="text-on-surface-variant font-medium max-w-sm mx-auto">
              Batches will appear here once they are marked as 'Sent' by staff.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
