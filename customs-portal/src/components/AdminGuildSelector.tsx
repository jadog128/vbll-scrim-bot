"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Server, ShieldCheck, Globe, Bot } from "lucide-react";

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  hasBot: boolean;
}

export default function AdminGuildSelector({ guilds }: { guilds: Guild[] }) {
  const [filter, setFilter] = useState<"all" | "active">("active");
  const [search, setSearch] = useState("");

  const filteredGuilds = guilds.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || g.hasBot;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
           <ShieldCheck className="w-4 h-4" />
           Administrative Access
        </div>
        <h2 className="text-4xl font-black text-on-surface tracking-tight">Select a League</h2>
        <p className="text-on-surface-variant font-medium max-w-md mx-auto">
          Manage requests, batches, and support tickets for your authorized servers.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-low p-4 rounded-[2.5rem] border border-outline-variant/10 shadow-ambient">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
          <input 
            type="text" 
            placeholder="Search servers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
          />
        </div>

        <div className="flex bg-surface-container-high rounded-2xl p-1.5">
          <button 
            onClick={() => setFilter("active")}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              filter === "active" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Active Leagues
          </button>
          <button 
            onClick={() => setFilter("all")}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              filter === "all" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            All Authorized
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuilds.map((g) => (
          <Link 
            key={g.id} 
            href={`/admin?guild=${g.id}`} 
            className="group relative bg-white rounded-[2.5rem] p-6 border border-outline-variant/5 shadow-ambient hover:shadow-floating transition-all hover:translate-y-[-6px] overflow-hidden"
          >
            {g.hasBot && (
              <div className="absolute top-0 right-0 p-4">
                 <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-tighter">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    Live
                 </div>
              </div>
            )}

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-3xl font-black text-on-surface-variant shadow-inner ring-4 ring-white transition-transform group-hover:scale-105 duration-500">
                  {g.icon ? (
                    <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} className="w-full h-full rounded-3xl object-cover" />
                  ) : g.name[0]}
                </div>
                {g.hasBot && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white border-4 border-white shadow-ambient">
                     <Bot className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div>
                 <h3 className="font-bold text-lg text-on-surface group-hover:text-primary transition-colors line-clamp-1">{g.name}</h3>
                 <p className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-[0.2em] mt-1 group-hover:text-primary/40 transition-colors">
                    {g.hasBot ? "Manage System" : "Needs Setup"}
                 </p>
              </div>

              <div className="w-full pt-4 border-t border-outline-variant/5">
                 <button className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                   g.hasBot 
                     ? "bg-primary text-white shadow-primary/20 group-hover:bg-primary-container group-hover:text-on-primary-container" 
                     : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                 }`}>
                    Enter Dashboard
                 </button>
              </div>
            </div>
          </Link>
        ))}

        {filteredGuilds.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
             <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
                <Search className="w-10 h-10" />
             </div>
             <div>
                <h4 className="font-bold text-lg">No Servers Found</h4>
                <p className="text-sm font-medium">Try adjusting your filters or search terms.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
