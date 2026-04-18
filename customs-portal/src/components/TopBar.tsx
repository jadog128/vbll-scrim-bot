"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function TopBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === "/admin") return "Conservatory";
    if (pathname === "/dashboard") return "Dashboard";
    return "Portal";
  };

  return (
    <header className="bg-surface/80 backdrop-blur-xl text-primary sticky top-0 z-40 flex justify-between items-center w-full px-8 h-20 shadow-xl shadow-primary/5">
      <div className="flex items-center">
        <span className="text-2xl font-extrabold tracking-tighter text-primary">
          {getPageTitle()}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-all text-on-surface-variant">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-all text-on-surface-variant">
            <span className="material-symbols-outlined">forum</span>
          </button>
        </div>

        {session?.user && (
          <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-primary leading-tight lowercase">@{session.user.name}</div>
              <button 
                onClick={() => signOut()}
                className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors"
              >
                Sign Out
              </button>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-surface-container-highest cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
              <img src={session.user.image || ""} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
