"use client";

import { useState, useEffect, Suspense } from "react";
import { Gift, Trash2, RotateCcw, Plus, ExternalLink, Timer, Trophy, CheckCircle2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function GiveawayManagerContent() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  
  const { data: giveaways, mutate } = useSWR(`/api/giveaways?guild=${guildId}&type=all`, fetcher);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleAction = async (action: 'end' | 'delete', id: string) => {
    setIsProcessing(id);
    try {
      const res = await fetch('/api/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, guildId })
      });
      if (res.ok) {
        toast.success(action === 'end' ? "Giveaway termination scheduled!" : "Giveaway purged.");
        mutate();
      }
    } catch (e) {
      toast.error("Failed to perform action");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-on-surface tracking-tighter flex items-center gap-4">
            <div className="p-3 bg-secondary text-white rounded-2xl shadow-glow">
                 <Gift className="w-8 h-8" />
            </div>
            Giveaway Controller
          </h1>
          <p className="text-on-surface-variant text-sm font-medium opacity-60">Manage all active and past giveaways across your server.</p>
        </div>
        
        <div className="flex gap-3">
           <div className="px-6 py-3 bg-white border border-outline-variant/10 rounded-2xl shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">Active Counter</div>
              <div className="text-xl font-black text-on-surface">{giveaways?.filter((g:any) => g.status === 'active').length || 0} Events</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {giveaways?.map((gw: any) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={gw.id} 
              className={`bg-white rounded-[2.5rem] border ${gw.status === 'active' ? 'border-primary/20 shadow-ambient' : 'border-outline-variant/5 shadow-sm'} p-8 flex flex-col md:flex-row md:items-center gap-8 group`}
            >
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 ${gw.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant/40'}`}>
                <Gift className="w-10 h-10" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">{gw.prize}</h3>
                  <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${gw.status === 'active' ? 'bg-primary text-black' : 'bg-surface-container-high text-on-surface-variant/60'}`}>
                    {gw.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant/60">
                    <Timer className="w-3 h-3 text-secondary" />
                    {gw.status === 'active' ? `Ends ${new Date(gw.end_time).toLocaleString()}` : `Ended ${new Date(gw.end_time).toLocaleString()}`}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant/60">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    {gw.winners_count} Winner(s)
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 rounded-lg">
                    {gw.entryCount} Entries Registered
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                 <a 
                    href={`https://discord.com/channels/${gw.guild_id}/${gw.channel_id}/${gw.msg_id}`}
                    target="_blank"
                    className="p-4 bg-surface-container-high text-on-surface hover:bg-black hover:text-white rounded-2xl transition-all shadow-sm"
                    title="View Message"
                 >
                    <ExternalLink className="w-5 h-5" />
                 </a>

                 {gw.status === 'active' && (
                    <button 
                      onClick={() => handleAction('end', gw.id)}
                      disabled={isProcessing === gw.id}
                      className="px-6 py-4 bg-secondary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-glow-secondary transition-all flex items-center gap-2"
                    >
                      {isProcessing === gw.id ? <RotateCcw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      End Now
                    </button>
                 )}

                 <button 
                  onClick={() => handleAction('delete', gw.id)}
                  disabled={isProcessing === gw.id}
                  className="p-4 bg-error/5 text-error hover:bg-error hover:text-white rounded-2xl transition-all border border-error/10"
                  title="Purge Logs"
                 >
                    <Trash2 className="w-5 h-5" />
                 </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(!giveaways || giveaways.length === 0) && (
            <div className="py-32 text-center bg-white/40 rounded-[3rem] border-2 border-dashed border-outline-variant/10">
                <div className="w-20 h-20 bg-surface-container rounded-full mx-auto flex items-center justify-center mb-6 opacity-20">
                    <Gift className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-on-surface opacity-40">No giveaways found for this league</h3>
                <p className="text-sm font-medium text-on-surface-variant opacity-30">Use `/giveaway-start` on Discord to create one.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default function AdminGiveawaysPage() {
    return (
        <Suspense fallback={<div>Loading Controller...</div>}>
            <GiveawayManagerContent />
        </Suspense>
    );
}
