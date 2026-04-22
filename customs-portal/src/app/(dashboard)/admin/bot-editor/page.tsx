"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Save, RotateCcw, Variable, Smartphone, Monitor, Info, CheckCircle2, AlertTriangle, Code, Palette, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DiscordEmbedPreview from "@/components/DiscordEmbedPreview";
import { toast } from "sonner";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const BOT_TEMPLATES = {
    approval: {
        title: "✅ Request Approved!",
        description: "Your batch request **{request_id}** has been processed by **{staff_name}**.\n\nYou have been granted access to the scrim channel.",
        color: "#2ecc71",
        footerText: "VBLL Operations",
        timestamp: true,
        fields: [{ name: "League", value: "{league_id}", inline: true }, { name: "Batch ID", value: "{batch_id}", inline: true }]
    },
    rejection: {
        title: "❌ Request Denied",
        description: "Sorry {user_name}, your request **{request_id}** was rejected.\n\n**Reason:** {reason}\n\nPlease update your proof and re-submit.",
        color: "#e74c3c",
        footerText: "VBLL Appeals",
        timestamp: true,
        fields: []
    },
    broadcast: {
        title: "📢 Global Announcement",
        description: "{message}",
        color: "#5865f2",
        authorName: "Lucid HQ",
        footerText: "Broadcasting to all servers",
        timestamp: true,
        fields: []
    }
};

export default function BotEditorPage() {
    const { data: savedTemplates, mutate } = useSWR('/api/admin/settings/bot-personality', fetcher);
    const [activeTab, setActiveTab] = useState<keyof typeof BOT_TEMPLATES>("approval");
    const [config, setConfig] = useState(BOT_TEMPLATES[activeTab]);
    const [isSaving, setIsSaving] = useState(false);

    // Load from DB if exists, else use defaults
    useEffect(() => {
        if (savedTemplates && savedTemplates[activeTab]) {
            setConfig(savedTemplates[activeTab]);
        } else {
            setConfig(BOT_TEMPLATES[activeTab]);
        }
    }, [activeTab, savedTemplates]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/settings/bot-personality', {
                method: 'POST',
                body: JSON.stringify({ category: activeTab, config }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                toast.success(`Successfully deployed ${activeTab} personality!`);
                mutate();
            }
        } catch (err) {
            toast.error("Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };


    const updateField = (path: string, value: any) => {
        setConfig(prev => ({ ...prev, [path]: value }));
    };

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-on-surface tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-primary text-white rounded-2xl shadow-glow">
                             <Zap className="w-8 h-8" />
                        </div>
                        Bot Command Designer
                    </h1>
                    <p className="text-on-surface-variant font-medium opacity-60">Architect your bot's personality and templates without code.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button className="px-6 py-3 bg-surface-container-high rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Reset Default
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-glow transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Deploy Configuration
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Editor Side */}
                <div className="xl:col-span-7 space-y-8">
                    {/* Category Selection */}
                    <div className="bg-white rounded-[2.5rem] p-3 border border-outline-variant/10 shadow-sm flex gap-2">
                        {Object.keys(BOT_TEMPLATES).map((cat) => (
                            <button 
                                key={cat}
                                onClick={() => setActiveTab(cat as any)}
                                className={`flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === cat 
                                        ? "bg-primary text-black shadow-ambient" 
                                        : "text-on-surface-variant/40 hover:bg-surface-container"
                                }`}
                            >
                                {cat} Template
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-[3rem] border border-outline-variant/10 shadow-massive p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" />
                                    Embed Title
                                </label>
                                <input 
                                    className="w-full bg-surface-container rounded-2xl p-5 text-sm font-bold text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all border border-outline-variant/5"
                                    value={config.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                                    <Palette className="w-3 h-3" />
                                    Brand Color
                                </label>
                                <div className="flex gap-4">
                                    <input 
                                        type="color"
                                        className="w-16 h-[60px] rounded-2xl cursor-pointer border-4 border-white shadow-ambient"
                                        value={config.color}
                                        onChange={(e) => updateField('color', e.target.value)}
                                    />
                                    <input 
                                        className="flex-1 bg-surface-container rounded-2xl p-5 text-sm font-mono font-bold text-on-surface focus:outline-none border border-outline-variant/5 uppercase"
                                        value={config.color}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                                    <Code className="w-3 h-3" />
                                    Main Description
                                </label>
                                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[8px] font-black tracking-widest uppercase">
                                    Variables Supported
                                </div>
                            </div>
                            <textarea 
                                className="w-full bg-surface-container rounded-[2rem] p-6 text-sm font-bold text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all border border-outline-variant/5 min-h-[160px] leading-relaxed"
                                value={config.description}
                                onChange={(e) => updateField('description', e.target.value)}
                            />
                        </div>

                        <div className="p-6 bg-surface-container-low rounded-[2rem] border border-outline-variant/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2">
                                <Variable className="w-3 h-3" />
                                Dynamic Placeholders
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {["{user_name}", "{user_id}", "{request_id}", "{staff_name}", "{reason}", "{league_id}"].map(v => (
                                    <button 
                                        key={v}
                                        onClick={() => updateField('description', config.description + " " + v)}
                                        className="px-3 py-1.5 bg-white rounded-xl text-[10px] font-bold text-on-surface-variant shadow-sm border border-outline-variant/10 hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Side */}
                <div className="xl:col-span-5 relative">
                    <div className="sticky top-10 space-y-6">
                        <div className="flex items-center justify-between px-6">
                             <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40">Live Real-time Preview</h2>
                             <div className="flex gap-2">
                                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                <div className="w-2 h-2 bg-success rounded-full opacity-40" />
                                <div className="w-2 h-2 bg-success rounded-full opacity-20" />
                             </div>
                        </div>

                        <div className="p-8 bg-surface-container-low rounded-[4rem] border border-outline-variant/10 shadow-inner">
                            <DiscordEmbedPreview embed={config as any} />
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-outline-variant/10 shadow-sm space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-xl">
                                    <AlertTriangle className="text-amber-600 w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black text-on-surface">Prerender Warning</h4>
                                    <p className="text-xs font-medium text-on-surface-variant opacity-70">
                                        Some variables like <code className="bg-surface-container px-1 py-0.5 rounded text-amber-700">{"{reason}"}</code> will only display in the preview if you are editing the Rejection category.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
