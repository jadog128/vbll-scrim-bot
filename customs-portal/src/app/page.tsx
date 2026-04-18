import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { ArrowRight, Bot, Shield, Zap, Layers } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center text-center space-y-16 py-20 pb-40 min-h-[80vh] relative overflow-hidden">
      {/* Decorative Hero Blur */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -z-10" />

      {/* Hero Section */}
      <div className="space-y-8 max-w-4xl relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase text-[10px] font-black tracking-widest mb-4">
          <Zap className="w-3 h-3 animate-pulse" /> Official VBLL Customs Portal
        </div>
        
        <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-[0.9] text-primary">
          LUCID <span className="text-on-surface-variant/20 italic">PORTAL</span>
        </h1>
        
        <p className="text-xl text-on-surface-variant font-medium max-w-2xl mx-auto leading-relaxed">
          The next generation of request management. Track batches, verify items, and synchronize with the Discord operations center.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link href="/dashboard">
            <GlassButton variant="primary" size="lg" className="w-full sm:w-auto shadow-ambient">
              Enter Dashboard <ArrowRight className="w-5 h-5 ml-2" />
            </GlassButton>
          </Link>
          <Link href="https://discord.gg/vbll" target="_blank">
            <GlassButton variant="outline" size="lg" className="w-full sm:w-auto">
              Join Discord Community
            </GlassButton>
          </Link>
        </div>
      </div>

      {/* Stats/Features Minimal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl pt-10">
        <div className="flex flex-col items-center p-8 rounded-[3rem] bg-surface-container-low border border-outline-variant/10 space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-primary flex items-center justify-center text-white shadow-ambient">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-primary italic underline underline-offset-4 decoration-primary/20">Bento Batches</h3>
          <p className="text-on-surface-variant text-sm font-medium leading-relaxed uppercase tracking-wider opacity-60">Optimized grouping for shipping dev oversight.</p>
        </div>

        <div className="flex flex-col items-center p-8 rounded-[3rem] bg-surface-container-low border border-outline-variant/10 space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-secondary flex items-center justify-center text-white shadow-ambient">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-secondary italic underline underline-offset-4 decoration-secondary/20">Encrypted Flow</h3>
          <p className="text-on-surface-variant text-sm font-medium leading-relaxed uppercase tracking-wider opacity-60">Direct Bot-to-Web Handshake protocol enabled.</p>
        </div>

        <div className="flex flex-col items-center p-8 rounded-[3rem] bg-surface-container-low border border-outline-variant/10 space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-white border border-primary/20 flex items-center justify-center text-primary shadow-ambient">
            <Bot className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-primary italic underline underline-offset-4 decoration-primary/20">Auto Sync</h3>
          <p className="text-on-surface-variant text-sm font-medium leading-relaxed uppercase tracking-wider opacity-60">Real-time status mirroring across all environments.</p>
        </div>
      </div>
    </div>
  );
}
