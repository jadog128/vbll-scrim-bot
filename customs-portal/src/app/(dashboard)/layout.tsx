import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import Providers from "@/components/Providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
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
    </Providers>
  );
}
