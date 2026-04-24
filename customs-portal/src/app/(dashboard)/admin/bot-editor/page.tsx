"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Save, RotateCcw, Variable, Smartphone, Monitor, Info, CheckCircle2, AlertTriangle, Code, Palette, Zap, Settings2, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import DiscordEmbedPreview from "@/components/DiscordEmbedPreview";
import { toast } from "sonner";
import useSWR from "swr";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const BOT_TEMPLATES = {
    approval: {
        id: "approval",
        label: "Approval Message",
        title: "✅ Batch Approved!",
        description: "Your batch request **{request_id}** has been processed by **{staff_name}**.\n\nYou have been granted access to the batch channel.",
        color: "#2ecc71",
        footerText: "VBLL Operations",
        timestamp: true,
        fields: [{ name: "League", value: "{league_id}", inline: true }, { name: "Batch ID", value: "{batch_id}", inline: true }]
    },
    rejection: {
        id: "rejection",
        label: "Rejection Message",
        title: "❌ Batch Denied",
        description: "Sorry {user_name}, your batch request **{request_id}** was rejected.\n\n**Reason:** {reason}\n\nPlease update your data and re-submit.",
        color: "#e74c3c",
        footerText: "VBLL Appeals",
        timestamp: true,
        fields: []
    },
    broadcast: {
        id: "broadcast",
        label: "Global Broadcast",
        title: "📢 Global Announcement",
        description: "{message}",
        color: "#5865f2",
        authorName: "Lucid HQ",
        footerText: "Broadcasting to all servers",
        timestamp: true,
        fields: []
    },
    welcome: {
        id: "welcome",
        label: "Welcome Msg",
        title: "👋 Welcome to the League!",
        description: "Hey {user_name}, welcome to the pride of VBLL.\n\nUse `/batch` to start your first submission or check out <#12345> for rules.",
        color: "#00f5a0",
        footerText: "Lucid Management",
        timestamp: false,
        fields: []
    },
    help: {
        id: "help",
        label: "Help Menu",
        title: "🛠️ Batch Bot Help",
        description: "Here is your quick guide to using the portal and bot:\n\n**/batch** - Submit a batch\n**/profile** - View your stats\n**/shop** - Redeem your points",
        color: "#3498db",
        footerText: "Powered by Lucid Portal",
        timestamp: true,
        fields: []
    },
    profile: {
        id: "profile",
        label: "Profile View",
        title: "👤 {user_name}'s Professional Profile",
        description: "Viewing identity data for {user_id}.\n\n**Status:** {verified_status}\n**League Points:** {points} ⭐",
        color: "#9b59b6",
        footerText: "VRFS Statistics",
        timestamp: false,
        fields: []
    },
    giveaway: {
        id: "giveaway",
        label: "Giveaway Msg",
        title: "🎁 ACTIVE GIVEAWAY: {prize}",
        description: "Click the button below to enter!\n\n**Winners:** {winners}\n**Ends:** {end_time}",
        color: "#00f5a0",
        footerText: "Good luck!",
        timestamp: true,
        fields: []
    }
};


const CORE_SETTINGS = {
    bot_nickname: "Lucid Batch Bot",
    status_text: "Managing Batches for VBLL",
    maintenance_mode: "false",
    audit_log_verbose: "true",
    auto_approve_verified: "false",
    batch_cooldown: "3600"
};

function BotEditorContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const guildId = searchParams.get("guild");
    
    useEffect(() => {
        if (!guildId) {
            router.push("/admin/select");
        }
    }, [guildId, router]);

    const { data: savedTemplates, mutate } = useSWR(guildId ? `/api/admin/settings/bot-personality?guild=${guildId}` : null, fetcher);

    const activeGuild = (session?.user as any)?.manageableGuilds?.find((g: any) => g.id === guildId);

    const [viewMode, setViewMode] = useState<"embeds" | "core">("embeds");
    const [activeTab, setActiveTab] = useState<keyof typeof BOT_TEMPLATES>("approval");
    const [config, setConfig] = useState(BOT_TEMPLATES[activeTab]);
    const [coreConfigs, setCoreConfigs] = useState(CORE_SETTINGS);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch correctly scoped settings when tab or guild changes
    useEffect(() => {
        if (viewMode === "embeds") {
            const saved = savedTemplates?.[activeTab];
            setConfig(saved || BOT_TEMPLATES[activeTab]);
        }
        if (savedTemplates?.bot_core_config) {
            setCoreConfigs(savedTemplates.bot_core_config);
        }
    }, [activeTab, savedTemplates, viewMode]);

    const handleSave = async () => {
        if (!guildId) return;
        setIsSaving(true);
        try {
            const body = viewMode === "embeds" 
                ? { category: activeTab, config, type: 'template', guild: guildId }
                : { config: coreConfigs, type: 'core', guild: guildId };

            const res = await fetch('/api/admin/settings/bot-personality', {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                toast.success(`Successfully deployed ${viewMode === "embeds" ? activeTab : "Core"} personality!`);
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
                        Batch Bot Designer
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full border border-primary/10">
                            {activeGuild?.icon ? (
                                <img src={`https://cdn.discordapp.com/icons/${activeGuild.id}/${activeGuild.icon}.png`} className="w-4 h-4 rounded-full" alt="" />
                            ) : (
                                <Globe className="w-3 h-3 text-primary" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                Editing: {activeGuild?.name || "Global Instance"}
                            </span>
                        </div>
                        <p className="text-on-surface-variant text-[11px] font-medium opacity-40">Architect your batch bot's personality and logic without code.</p>
                    </div>
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

            <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-3 border border-outline-variant/10 shadow-sm flex gap-2 w-fit mx-auto">
                <button 
                    onClick={() => setViewMode("embeds")}
                    className={`py-3 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        viewMode === "embeds" ? "bg-black text-white shadow-lg" : "text-on-surface-variant/40 hover:bg-white/50"
                    }`}
                >
                    <Smartphone className="w-4 h-4" />
                    Embed Designer
                </button>
                <button 
                    onClick={() => setViewMode("core")}
                    className={`py-3 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        viewMode === "core" ? "bg-black text-white shadow-lg" : "text-on-surface-variant/40 hover:bg-white/50"
                    }`}
                >
                    <Settings2 className="w-4 h-4" />
                    Core System Config
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-7 space-y-8">
                    {viewMode === "embeds" ? (
                        <>
                            <div className="bg-white rounded-[2rem] p-3 border border-outline-variant/10 shadow-sm flex flex-wrap gap-2">
                                {Object.values(BOT_TEMPLATES).map((cat) => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id as any)}
                                        className={`py-3 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                            activeTab === cat.id 
                                                ? "bg-primary text-black shadow-ambient" 
                                                : "text-on-surface-variant/40 hover:bg-surface-container"
                                        }`}
                                    >
                                        {cat.label}
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

                                <div className="p-6 bg-surface-container-low rounded-[1.5rem] border border-outline-variant/10">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2">
                                        <Variable className="w-3 h-3" />
                                        Placeholders for {activeTab}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {["{user_name}", "{user_id}", "{request_id}", "{staff_name}", "{reason}", "{league_id}", "{points}", "{verified_status}"].map(v => (
                                            <button 
                                                key={v}
                                                onClick={() => updateField('description', config.description + " " + v)}
                                                className="px-3 py-1.5 bg-white rounded-xl text-[9px] font-bold text-on-surface-variant shadow-sm border border-outline-variant/10 hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-[3rem] border border-outline-variant/10 shadow-massive p-10 space-y-10">
                            <div className="space-y-6">
                                <h3 className="text-xl font-black text-on-surface tracking-tighter">Bot Identity & Hub</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Bot Nickname</label>
                                        <input 
                                            className="w-full bg-surface-container rounded-2xl p-5 text-sm font-bold text-on-surface border border-outline-variant/10" 
                                            value={coreConfigs.bot_nickname}
                                            onChange={(e) => setCoreConfigs({ ...coreConfigs, bot_nickname: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status Text</label>
                                        <input 
                                            className="w-full bg-surface-container rounded-2xl p-5 text-sm font-bold text-on-surface border border-outline-variant/10" 
                                            value={coreConfigs.status_text}
                                            onChange={(e) => setCoreConfigs({ ...coreConfigs, status_text: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xl font-black text-on-surface tracking-tighter">System Logic Toggles</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {[
                                     { id: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Disables all user requests instantly.' },
                                     { id: 'audit_log_verbose', label: 'Detailed Logging', desc: 'Saves every single button click to logs.' },
                                     { id: 'auto_approve_verified', label: 'Auto-Approve Syncs', desc: 'Instantly confirms verified-sync players.' }
                                   ].map(toggle => (
                                     <button 
                                        key={toggle.id}
                                        onClick={() => setCoreConfigs({ ...coreConfigs, [toggle.id]: (coreConfigs as any)[toggle.id] === 'true' ? 'false' : 'true' })}
                                        className={`p-6 rounded-[2rem] border transition-all text-left flex justify-between items-center ${
                                            (coreConfigs as any)[toggle.id] === 'true' 
                                            ? "bg-primary/5 border-primary/20" 
                                            : "bg-surface-container-low border-outline-variant/10 opacity-60"
                                        }`}
                                     >
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-on-surface">{toggle.label}</p>
                                            <p className="text-[10px] font-medium text-on-surface-variant">{toggle.desc}</p>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full p-1 transition-all ${
                                            (coreConfigs as any)[toggle.id] === 'true' ? "bg-primary" : "bg-outline-variant/40"
                                        }`}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                                                (coreConfigs as any)[toggle.id] === 'true' ? "translate-x-6" : "translate-x-0"
                                            }`} />
                                        </div>
                                     </button>
                                   ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

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
                                    <h4 className="text-sm font-black text-on-surface">Precision Note</h4>
                                    <p className="text-xs font-medium text-on-surface-variant opacity-70">
                                        The preview uses a mock "Bot Identity." Saving here will deploy the templates to your production instance immediately.
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

export default function BotEditorPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <BotEditorContent />
        </Suspense>
    );
}
