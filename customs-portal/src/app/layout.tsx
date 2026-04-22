import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/react";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-jakarta",
  weight: ['400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: "VBLL Portal - Request Management",
  description: "Manage your custom requests and batches",
};

import SupportWidget from "@/components/SupportWidget";

import { Toaster } from "sonner";

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
      <body className={`${jakarta.variable} antialiased bg-surface text-on-surface flex flex-col min-h-screen`}>
        <Providers>
          <main className="flex-grow">
            {children}
          </main>
          <SupportWidget />
          <Toaster position="bottom-right" richColors theme="light" />
        </Providers>
        <Analytics />
      </body>

    </html>
  );
}
