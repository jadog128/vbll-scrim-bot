import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { ArrowRight, Box, Shield, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center text-center space-y-12 py-12">
      {/* Hero Section */}
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-none">
          ELEVATE YOUR <br />
          <span className="text-blue-500">CUSTOM GEAR</span>
        </h1>
        <p className="text-lg text-white/50 max-w-xl mx-auto">
          The official VBLL Customs Portal. Track your requests, manage batches, and get your gear verified in record time.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/dashboard">
            <GlassButton variant="primary" size="lg" className="gap-2">
              Get Started <ArrowRight className="w-5 h-5" />
            </GlassButton>
          </Link>
          <Link href="https://discord.gg/vbll" target="_blank">
            <GlassButton size="lg">Join Discord</GlassButton>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12">
        <GlassCard className="text-left space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
            <Zap className="text-blue-400" />
          </div>
          <h3 className="text-xl font-bold">Fast Tracking</h3>
          <p className="text-white/40 text-sm">Real-time updates on your request status. No more guessing when your gear is ready.</p>
        </GlassCard>

        <GlassCard className="text-left space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/20">
            <Box className="text-purple-400" />
          </div>
          <h3 className="text-xl font-bold">Smart Batches</h3>
          <p className="text-white/40 text-sm">Automated grouping of requests into batches of 8 for streamlined developer processing.</p>
        </GlassCard>

        <GlassCard className="text-left space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center border border-emerald-500/20">
            <Shield className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold">Secure Portal</h3>
          <p className="text-white/40 text-sm">Secure Discord OAuth integration ensures only you can manage your personal requests.</p>
        </GlassCard>
      </div>

      {/* Animated Background Decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full -z-20 pointer-events-none animate-pulse" />
    </div>
  );
}
