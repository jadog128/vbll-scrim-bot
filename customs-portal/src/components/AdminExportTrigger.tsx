"use client";

import { useState } from "react";
import GlassButton from "./ui/GlassButton";
import { Download, Loader2 } from "lucide-react";

export default function AdminExportTrigger() {
  const [loading, setLoading] = useState(false);

  async function exportBatches() {
    setLoading(true);
    try {
      window.location.href = "/api/admin/export";
    } catch (e) {
      alert("Failed to trigger export.");
    }
    setLoading(false);
  }

  return (
    <GlassButton 
      onClick={exportBatches} 
      variant="primary" 
      disabled={loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Export Final Report
    </GlassButton>
  );
}
