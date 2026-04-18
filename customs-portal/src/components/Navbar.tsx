"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import GlassButton from "./ui/GlassButton";
import { LayoutDashboard, ShieldCheck, LogOut, Package } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <Package className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            VBLL CUSTOMS
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard">
                <GlassButton variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </GlassButton>
              </Link>
              
              {(session.user as any)?.isAdmin && (
                <Link href="/admin">
                  <GlassButton variant="ghost" size="sm" className="gap-2 text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </GlassButton>
                </Link>
              )}

              <div className="h-8 w-[1px] bg-white/10 mx-2" />

              <div className="flex items-center gap-3">
                <img 
                  src={session.user?.image || ""} 
                  alt="" 
                  className="w-8 h-8 rounded-full border border-white/20"
                />
                <GlassButton 
                  onClick={() => signOut()} 
                  variant="ghost" 
                  size="sm" 
                  className="px-2"
                >
                  <LogOut className="w-4 h-4" />
                </GlassButton>
              </div>
            </>
          ) : (
            <Link href="/api/auth/signin">
              <GlassButton variant="primary">Login with Discord</GlassButton>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
