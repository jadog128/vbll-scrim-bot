"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full py-8 border-t border-white/5 bg-surface-variant/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center space-y-2">
        <p className="text-on-surface-variant/60 text-sm font-medium">
          Made with <span className="text-error animate-pulse">❤️</span> by{" "}
          <span className="text-primary font-bold">Millo</span>
        </p>
        <Link 
          href="https://millos-services.vercel.app/" 
          target="_blank"
          className="text-xs text-on-surface-variant/40 hover:text-primary transition-colors duration-200"
        >
          millos-services.vercel.app
        </Link>
      </div>
    </footer>
  );
}
