import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-jakarta",
  weight: ['400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: "VBLL Portal - Request Management",
  description: "Manage your custom requests and batches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${jakarta.variable} antialiased bg-surface text-on-surface`}>
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
      </body>
    </html>
  );
}
