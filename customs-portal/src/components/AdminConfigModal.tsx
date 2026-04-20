"use client";

import { useState, useEffect } from "react";
import { Settings, X, Save, AlertCircle } from "lucide-react";

export default function AdminConfigModal({ guildId }: { guildId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState("");

  useEffect(() => {
    if (isOpen) {
        fetch(`/api/admin/config?guild=${guildId}`)
        .then(res => res.json())
        .then(data => {
            const val = data.find((s: any) => s.key === 'reject_presets')?.value || "";
            setPresets(val);
        });
    }
  }, [isOpen, guildId]);

  async function handleSave() {
    setLoading(true);
    try {
        await fetch(`/api/admin/config?guild=${guildId}`, { 
            method: "POST", 
            body: JSON.stringify({ key: 'reject_presets', value: presets }),
            headers: { 'Content-Type': 'application/json' }
        });
        setIsOpen(false);
        window.location.reload();
    } catch (e) {
        alert("Failed to save settings");
    }
    setLoading(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2.5 bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-all shadow-sm"
        title="Admin Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
           
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                       <Settings className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-on-surface tracking-tight">League Settings</h3>
                       <p className="text-xs text-on-surface-variant font-medium">Configure global system behavior.</p>
                    </div>
                 </div>
                 <button onClick={() => setIsOpen(false)} className="p-3 bg-surface-container-high rounded-2xl">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                       Rejection Presets
                       <div className="group relative">
                          <AlertCircle className="w-3.5 h-3.5 text-on-surface-variant/40 cursor-help" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-3 bg-on-surface text-surface rounded-xl text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                            Separate reasons with commas. These will appear as quick-action buttons on every request.
                          </div>
                       </div>
                    </label>
                    <textarea 
                      value={presets}
                      onChange={(e) => setPresets(e.target.value)}
                      placeholder="Invalid Screenshot, Wrong Level, Duplicated ID..."
                      className="w-full p-5 bg-surface-container-low rounded-3xl text-sm font-medium border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] transition-all"
                    />
                 </div>

                 <button 
                   onClick={handleSave}
                   disabled={loading}
                   className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:translate-y-[-2px] active:translate-y-0 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                 >
                   <Save className="w-4 h-4" />
                   Apply Changes
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
