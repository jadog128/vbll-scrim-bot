"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, User, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then(res => res.json())
      .then(data => {
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const handleStatus = async (id: number, status: string) => {
    try {
      const res = await fetch("/api/admin/tickets/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        setTickets(prev => prev.filter(t => t.id !== id));
      } else {
        alert("Failed to update ticket.");
      }
    } catch (e) {
      alert("Error updating ticket.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-on-surface tracking-tightest leading-none mb-3">Support Tickets</h1>
          <p className="text-on-surface-variant font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-error" />
            Resolve issues reported by users regarding their batches.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="h-24 bg-white rounded-[2rem] animate-pulse" />
        ) : tickets.length > 0 ? (
          tickets.map((ticket: any) => (
            <div key={ticket.id} className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-ambient transition-all">
               <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-error/5 flex items-center justify-center text-error">
                        <ShieldAlert className="w-6 h-6" />
                     </div>
                     <div>
                        <h4 className="font-bold text-on-surface truncate">{ticket.username}</h4>
                        <div className="text-[10px] font-black text-error uppercase tracking-widest">TICKET #{ticket.id}</div>
                     </div>
                  </div>
                  <div className="text-[11px] font-black text-on-surface-variant opacity-30 flex items-center gap-1.5">
                     <Clock className="w-3.5 h-3.5" />
                     {new Date(ticket.created_at).toLocaleString()}
                  </div>
               </div>

               <div className="bg-surface-container-low rounded-2xl p-6 mb-6">
                  <p className="text-sm font-medium text-on-surface-variant italic leading-relaxed">
                     "{ticket.issue}"
                  </p>
               </div>

               <div className="flex gap-3">
                  <button onClick={() => handleStatus(ticket.id, 'closed')} className="px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">
                     Mark Resolved
                  </button>
                  <button className="px-6 py-2.5 bg-surface-container-high text-on-surface-variant text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">
                     Reject
                  </button>
               </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-outline-variant/10">
            <div className="w-20 h-20 bg-emerald-500/5 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
               <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-on-surface mb-2 tracking-tight">Inbox Zero</h3>
            <p className="text-on-surface-variant font-medium max-w-xs mx-auto">
              No open tickets! All batch issues have been successfully cleared.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
