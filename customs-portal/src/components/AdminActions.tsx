"use client";

import { useState, useEffect } from "react";
import GlassButton from "./ui/GlassButton";
import { Play, Pause, Send } from "lucide-react";

export default function AdminActions() {
  const [loading, setLoading] = useState(false);
  const [halted, setHalted] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        const isHalted = data.find((s: any) => s.key === 'halted')?.value === 'true';
        setHalted(isHalted);
      });
  }, []);

  async function toggleHalt() {
    setLoading(true);
    try {
        const res = await fetch("/api/admin/config", { 
            method: "POST", 
            body: JSON.stringify({ key: 'halted', value: 'toggle' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        setHalted(data.newValue === 'true');
    } catch (e) {}
    setLoading(false);
  }

  return (
    <div className="flex gap-3">
      <GlassButton onClick={toggleHalt} disabled={loading} variant="secondary" size="sm" className="gap-2">
        {halted ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        {halted ? 'Resume Requests' : 'Halt All Requests'}
      </GlassButton>
      <GlassButton variant="primary" size="sm" className="gap-2">
        <Send className="w-4 h-4" /> Post New Queue Message
      </GlassButton>
    </div>
  );
}
