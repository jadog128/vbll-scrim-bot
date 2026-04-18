"use client";

import { useState } from "react";
import GlassButton from "./ui/GlassButton";
import { Play, Pause, Send } from "lucide-react";

export default function AdminActions() {
  const [halting, setHalting] = useState(false);

  async function toggleHalt() {
    setHalting(true);
    // Logic to toggle halt setting in DB via API
    try {
        await fetch("/api/admin/config", { 
            method: "POST", 
            body: JSON.stringify({ key: 'halted', value: 'toggle' }),
            headers: { 'Content-Type': 'application/json' }
        });
        window.location.reload();
    } catch (e) {}
    setHalting(false);
  }

  return (
    <div className="flex gap-3">
      <GlassButton onClick={toggleHalt} disabled={halting} variant="secondary" size="sm" className="gap-2">
        <Pause className="w-4 h-4" /> Halt All Requests
      </GlassButton>
      <GlassButton variant="primary" size="sm" className="gap-2">
        <Send className="w-4 h-4" /> Post New Queue Message
      </GlassButton>
    </div>
  );
}
