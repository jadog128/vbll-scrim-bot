"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trash2, Ban, Layers, MousePointer } from "lucide-react";
import AdminRequestRow from "./AdminRequestRow";

export default function AdminBulkRequests({ 
  requests, 
  rejectPresets 
}: { 
  requests: any[], 
  rejectPresets: string[] 
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setIsBulkMode(false);
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Are you sure you want to remove ${selectedIds.length} requests from this view?`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/requests/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestIds: selectedIds, action })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Bulk action failed");
      }
    } catch (e) {
      alert("Error processing bulk action");
    }
    setLoading(false);
  };

  return (
    <div className="relative">
      {/* Bulk Mode Toggle */}
      <div className="flex justify-end mb-4">
         <button 
           onClick={() => {
              setIsBulkMode(!isBulkMode);
              if (isBulkMode) setSelectedIds([]);
           }}
           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
             isBulkMode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
           }`}
         >
           {isBulkMode ? <MousePointer className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
           {isBulkMode ? 'Exit Selection' : 'Bulk Selection'}
         </button>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="relative group">
            {isBulkMode && (
               <div 
                 onClick={() => toggleSelection(req.id)}
                 className={`absolute inset-0 z-20 cursor-pointer rounded-[2rem] transition-all border-2 ${
                   selectedIds.includes(req.id) 
                   ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                   : 'border-transparent hover:border-primary/30'
                 }`}
               >
                  <div className={`absolute top-4 right-4 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    selectedIds.includes(req.id) ? 'bg-primary text-white scale-110' : 'bg-white/80 text-transparent border border-outline-variant/20'
                  }`}>
                    <Check className="w-4 h-4" />
                  </div>
               </div>
            )}
            <AdminRequestRow request={req} rejectPresets={rejectPresets} />
          </div>
        ))}

        {requests.length === 0 && (
          <div className="py-20 text-center bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/10">
             <p className="text-on-surface-variant font-medium">
                No requests found in this queue.
             </p>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-2xl px-6"
          >
            <div className="bg-on-surface text-surface rounded-[2.5rem] p-4 shadow-2xl flex items-center justify-between gap-6 border border-white/10 backdrop-blur-md">
               <div className="flex items-center gap-4 pl-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center text-sm font-black">
                    {selectedIds.length}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-surface/60">Selected</div>
                    <div className="text-sm font-bold text-surface">Manage Submissions</div>
                  </div>
               </div>

               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleBulkAction('approve')}
                    disabled={loading}
                    className="p-3 bg-white/10 rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button 
                    onClick={() => handleBulkAction('reject')}
                    disabled={loading}
                    className="p-3 bg-white/10 rounded-2xl hover:bg-error hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                  >
                    <Ban className="w-4 h-4" />
                    Reject
                  </button>
                  <div className="w-[1px] h-8 bg-white/10 mx-1" />
                  <button 
                    onClick={() => handleBulkAction('delete')}
                    disabled={loading}
                    className="p-3 bg-white/10 rounded-2xl hover:bg-error hover:text-white transition-all text-error"
                    title="Remove from View"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={clearSelection}
                    className="p-3 text-white/40 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
