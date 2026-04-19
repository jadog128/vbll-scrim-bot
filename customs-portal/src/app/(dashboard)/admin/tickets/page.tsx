"use client";

import { useEffect, useState, Suspense } from "react";
import { MessageSquare, CheckCircle } from "lucide-react";
import AdminTicketRow from "@/components/AdminTicketRow";
import { useSearchParams, useRouter } from "next/navigation";

function TicketsContent() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const guildId = searchParams.get("guild");

  useEffect(() => {
    if (!guildId) {
      router.push("/admin/select");
      return;
    }

    const fetchTickets = () => {
      fetch(`/api/admin/tickets?guild=${guildId}`)
        .then(res => res.json())
        .then(data => {
          const newTickets = Array.isArray(data) ? data : [];
          if (newTickets.length > tickets.length && tickets.length > 0) {
             const audio = new Audio("https://raw.githubusercontent.com/jadog128/vbll-scrim-bot/main/notification.mp3");
             audio.play().catch(() => {});
          }
          setTickets(newTickets);
          setLoading(false);
        });
    };

    fetchTickets();
    const inv = setInterval(fetchTickets, 10000);
    return () => clearInterval(inv);
  }, [tickets.length]);

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
            <AdminTicketRow key={ticket.id} ticket={ticket} onStatusUpdate={handleStatus} />
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

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center animate-pulse text-on-surface-variant">Synchronizing Secure Context...</div>}>
      <TicketsContent />
    </Suspense>
  );
}
