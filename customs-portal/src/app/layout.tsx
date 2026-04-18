import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "VBLL Customs Portal",
  description: "Manage your custom requests and batches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <div className="bg-mesh" />
          <Navbar />
          <main className="min-h-screen pt-24 px-4 max-w-7xl mx-auto">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
