import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarChart3, MessageSquare, Plus, CheckCircle2 } from "lucide-react";
import LoginButton from "@/components/auth/LoginButton";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-jakarta antialiased flex overflow-hidden selection:bg-primary selection:text-white">
      {/* Left Pane: Interaction & Identity Layer */}
      <main className="w-full lg:w-[45%] flex flex-col justify-between p-8 md:p-16 lg:p-24 bg-surface relative z-20 shadow-[32px_0_64px_rgba(0,46,32,0.03)] h-screen overflow-y-auto">
        {/* Brand Anchor */}
        <header>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_8px_16px_rgba(0,46,32,0.2)]">
              <span className="material-symbols-outlined text-white icon-fill">forest</span>
            </div>
            <span className="text-2xl font-bold tracking-tighter text-primary">VBLL Portal</span>
          </div>
        </header>

        {/* Primary Value Proposition & CTA */}
        <div className="max-w-md my-auto space-y-12">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-[1.1]">
              Cultivate requests with precision.
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed font-medium">
              Enter a sophisticated workspace designed to streamline your workflow, track progress in real-time, and manage submissions with an editorial-inspired clarity.
            </p>
          </div>

          <LoginButton />

          <div className="flex items-center gap-3 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Secure, OAuth2 authentication. No passwords required.</span>
          </div>
        </div>

        {/* Footer / Legal */}
        <footer className="text-sm text-on-surface-variant/70 font-medium pt-8 uppercase tracking-widest text-[10px]">
          © 2026 VBLL • High-End Request Management.
        </footer>
      </main>

      {/* Right Pane: Contextual Showcase */}
      <aside className="hidden lg:flex w-[55%] bg-surface-container-low relative overflow-hidden items-center justify-center h-screen">
        <div 
          className="absolute inset-0 z-0 opacity-40 mix-blend-multiply bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=2000')" }}
        ></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-surface-container-low/90 via-surface-container-low/70 to-primary-fixed-dim/30"></div>
        
        {/* Asymmetrical Bento Grid Showcase */}
        <div className="relative z-10 w-full max-w-2xl transform lg:rotate-[-2deg] lg:scale-105 grid grid-cols-12 gap-6 p-8">
          <div className="col-span-12 md:col-span-8 bg-surface/80 backdrop-blur-2xl rounded-[1.5rem] p-8 shadow-[0_32px_64px_rgba(0,46,32,0.08)]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase mb-1 block">Active Workflow</span>
                <h3 className="text-2xl font-bold text-on-surface">Batch System V2</h3>
              </div>
              <div className="bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                Processing
              </div>
            </div>
            <div className="mt-8">
              <div className="flex justify-between text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-widest">
                <span>Verification</span>
                <span>74%</span>
              </div>
              <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-[74%] shimmer-active"></div>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_16px_48px_rgba(0,46,32,0.06)] flex flex-col justify-between">
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-on-surface mb-1">Live Sync</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">Direct Bot-to-Web integration.</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 bg-gradient-to-br from-primary to-primary-container rounded-[1.5rem] p-8 shadow-[0_24px_48px_rgba(0,46,32,0.15)] text-white">
            <BarChart3 className="mb-6 block w-8 h-8 opacity-80" />
            <div className="text-5xl font-extrabold tracking-tighter mb-2">1,204</div>
            <div className="text-primary-fixed text-xs font-bold uppercase tracking-widest opacity-60">Requests Managed</div>
          </div>

          <div className="col-span-12 md:col-span-7 bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-[0_16px_48px_rgba(0,46,32,0.06)]">
            <h4 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-6">Recent Activity</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-on-surface">Asset Pack Delivery</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-medium">Approved • 2m ago</div>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-on-surface">Sync Completed</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-medium">Developer B • 1h ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
