"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBan, setNewBan] = useState({ id: "", reason: "" });

  const fetchData = async () => {
    try {
      const [lRes, bRes] = await Promise.all([
        fetch("/api/admin/security/logs"),
        fetch("/api/admin/security/blacklist")
      ]);
      setLogs(await lRes.json());
      setBlacklist(await bRes.json());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalBan = async () => {
    if (!newBan.id || !newBan.reason) return;
    await fetch("/api/admin/security/blacklist", {
      method: "POST",
      body: JSON.stringify({ userId: newBan.id, reason: newBan.reason })
    });
    setNewBan({ id: "", reason: "" });
    fetchData();
  };

  const handleUnban = async (id: string) => {
    await fetch("/api/admin/security/blacklist", {
      method: "DELETE",
      body: JSON.stringify({ userId: id })
    });
    fetchData();
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-white">Initializing Apex...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-white italic">
              SENTINAL APEX SOC
            </h1>
            <p className="text-gray-400 mt-2 font-mono">Security Operations Center — VCC Protection Layer</p>
          </div>
          <Link href="/admin" className="px-6 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition font-mono">
            ← BACK TO COMMAND
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Logs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111112] border border-white/5 rounded-3xl p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[80px] -z-10" />
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE EVIDENCE VAULT
              </h2>
              
              <div className="space-y-3 font-mono text-sm max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {logs.map((log: any) => (
                  <div key={log.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action.includes('BAN') ? 'bg-red-500 text-white' : 
                        log.action.includes('TIMEOUT') ? 'bg-orange-500 text-white' : 
                        'bg-blue-500 text-white'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-gray-500 text-[10px]">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-gray-300">Target: <span className="text-red-400">{log.target_id}</span></p>
                        <p className="text-gray-400 mt-1">Reason: {log.reason}</p>
                        {log.evidence && (
                          <div className="mt-3 p-3 bg-black/40 rounded-lg text-xs text-gray-500 break-all border border-white/5">
                            {log.evidence}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Controls & Blacklist */}
          <div className="space-y-8">
            {/* Global Blacklist Add */}
            <div className="bg-[#111112] border border-red-500/20 rounded-3xl p-6 border-l-4">
              <h2 className="text-xl font-bold mb-4">GLOBAL BLACKLIST</h2>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Discord User ID" 
                  value={newBan.id}
                  onChange={e => setNewBan({...newBan, id: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition"
                />
                <input 
                  type="text" 
                  placeholder="Reason for Ban" 
                  value={newBan.reason}
                  onChange={e => setNewBan({...newBan, reason: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition"
                />
                <button 
                  onClick={handleGlobalBan}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-red-900/20"
                >
                  APPLY GLOBAL BAN
                </button>
              </div>
            </div>

            {/* Blacklist View */}
            <div className="bg-[#111112] border border-white/5 rounded-3xl p-6">
              <h2 className="text-lg font-bold mb-4 text-gray-400 uppercase tracking-widest">Active Blacklist</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {blacklist.map((item: any) => (
                  <div key={item.discord_id} className="p-3 bg-white/5 rounded-xl flex justify-between items-center group border border-transparent hover:border-white/10 transition">
                    <div>
                      <p className="text-sm font-mono text-white">{item.discord_id}</p>
                      <p className="text-[10px] text-gray-500 truncate w-32">{item.reason}</p>
                    </div>
                    <button 
                      onClick={() => handleUnban(item.discord_id)}
                      className="text-xs text-gray-500 hover:text-white underline opacity-0 group-hover:opacity-100 transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}
