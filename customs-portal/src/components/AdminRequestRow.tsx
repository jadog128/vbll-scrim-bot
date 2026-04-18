"use client";

import { useState } from 'react';
import { Package, ExternalLink, Edit2, Check, X } from 'lucide-react';

export default function AdminRequestRow({ request }: { request: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    vrfs_id: request.vrfs_id,
    status: request.status,
    batch_id: request.batch_id || ""
  });
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/requests/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, ...formData })
      });
      if (res.ok) window.location.reload();
      else alert("Update failed");
    } catch (e) {
      alert("Update failed");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-outline-variant/10 hover:shadow-ambient transition-all group relative overflow-hidden h-full">
      {/* Edit Form */}
      {isEditing ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Edit Request #{request.id}</h4>
            <div className="flex gap-2">
               <button onClick={handleUpdate} disabled={loading} className="p-2 bg-primary text-white rounded-xl hover:scale-105 transition-transform active:scale-95 shadow-sm">
                  <Check className="w-4 h-4" />
               </button>
               <button onClick={() => setIsEditing(false)} className="p-2 bg-surface-container-high text-on-surface-variant rounded-xl hover:scale-105 transition-transform active:scale-95">
                  <X className="w-4 h-4" />
               </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[9px] font-black text-on-surface-variant uppercase ml-1 opacity-50">VRFS ID</label>
                <input 
                  type="text" 
                  value={formData.vrfs_id} 
                  onChange={(e) => setFormData({...formData, vrfs_id: e.target.value})}
                  className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-outline-variant/10 focus:ring-1 focus:ring-primary/20 outline-none" 
                />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-on-surface-variant uppercase ml-1 opacity-50">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-outline-variant/10 focus:ring-1 focus:ring-primary/20 outline-none"
                >
                   <option value="pre_review">PRE_REVIEW</option>
                   <option value="pending">PENDING</option>
                   <option value="completed">COMPLETED</option>
                   <option value="rejected">REJECTED</option>
                </select>
             </div>
          </div>
          <div className="space-y-1">
              <label className="text-[9px] font-black text-on-surface-variant uppercase ml-1 opacity-50">Batch ID</label>
              <input 
                type="number" 
                value={formData.batch_id} 
                onChange={(e) => setFormData({...formData, batch_id: e.target.value})}
                placeholder="Leave empty for none"
                className="w-full p-2.5 bg-surface-container-low rounded-xl text-xs font-bold border border-outline-variant/10 focus:ring-1 focus:ring-primary/20 outline-none" 
              />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-all duration-300">
                 <Package className="w-6 h-6" />
              </div>
              <div className="max-w-[140px]">
                <h4 className="font-bold text-on-surface leading-tight mb-1 truncate">{request.username}</h4>
                <div className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest opacity-40">#{request.id} • {request.type}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => setIsEditing(true)}
                 className="p-2.5 bg-surface-container-low rounded-xl text-on-surface-variant hover:text-primary hover:bg-white border border-transparent hover:border-primary/20 transition-all shadow-sm"
                 title="Edit Request"
               >
                 <Edit2 className="w-3.5 h-3.5" />
               </button>
               {request.proof_url && (
                 <a 
                   href={request.proof_url} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="p-2.5 bg-surface-container-low rounded-xl text-on-surface-variant hover:text-primary hover:bg-white border border-transparent hover:border-primary/20 transition-all shadow-sm"
                   title="View Proof"
                 >
                   <ExternalLink className="w-3.5 h-3.5" />
                 </a>
               )}
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/5 shadow-inner">
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">VRFS ID</span>
                <span className="text-xs font-black text-on-surface tracking-tighter">{request.vrfs_id}</span>
             </div>

             <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full ${
                     request.status === 'completed' ? 'bg-primary' : 
                     request.status === 'pending' ? 'bg-blue-400' : 'bg-on-surface-variant/20'
                   }`} />
                   <span className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">{request.status}</span>
                </div>
                {request.batch_id ? (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Batch #{request.batch_id}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-on-surface-variant/20 italic uppercase tracking-widest">No Batch</span>
                )}
             </div>
          </div>
        </>
      )}
    </div>
  );
}
