"use client";

import { useState } from "react";
import GlassButton from "./ui/GlassButton";
import { Send, Loader2, Check } from "lucide-react";

export default function RequestTrigger({ type }: { type: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function trigger() {
    setStatus("loading");
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        body: JSON.stringify({ type }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch (e) {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <GlassButton 
      onClick={trigger} 
      disabled={status !== "idle"}
      className="w-full justify-between pr-4 group"
    >
      <span className="flex items-center gap-2">
        {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> :
         status === "success" ? <Check className="w-4 h-4 text-emerald-400" /> :
         <Send className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />}
        {type}
      </span>
      {status === "idle" && <span className="text-[10px] uppercase font-black opacity-20 group-hover:opacity-100">Request</span>}
    </GlassButton>
  );
}
