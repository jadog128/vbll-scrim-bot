import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Suspense fallback={<div className="w-64 h-full bg-surface-container-low" />}>
           <Sidebar />
        </Suspense>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-surface relative">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 2xl:px-12">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
