"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  const handleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Login button clicked, initiating Discord OAuth...");
    signIn("discord", { callbackUrl: "/dashboard" });
  };

  return (
    <button 
      onClick={handleLogin}
      className="w-full group relative flex items-center justify-center gap-4 bg-gradient-to-br from-primary to-primary-container text-white py-5 px-8 rounded-xl shadow-[0_16px_32px_rgba(0,46,32,0.12)] hover:shadow-[0_24px_48px_rgba(0,46,32,0.2)] transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <svg className="w-7 h-7 relative z-10 fill-current" viewBox="0 0 127.14 96.36">
        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1,105.25,105.25,0,0,0,32.19-16.14h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.3,46,96.19,53,91.08,65.69,84.69,65.69Z"></path>
      </svg>
      <span className="text-xl font-bold tracking-tight relative z-10">Login with Discord</span>
    </button>
  );
}
