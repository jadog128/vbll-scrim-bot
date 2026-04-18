"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import GlassButton from "./ui/GlassButton";

export default function SubmissionForm({ options }: { options: string[] }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get("type"),
      vrfsId: formData.get("vrfsId"),
      proofUrl: formData.get("proofUrl"),
    };

    try {
      const res = await fetch("/api/requests/submit", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to submit request.");
      }
    } catch (e) {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-surface-container-low rounded-[3rem] p-12 text-center border border-primary/10 space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-on-surface">Submission Received</h3>
          <p className="text-on-surface-variant font-medium">Your request has been sent for staff review. You will be notified in Discord when it's updated.</p>
        </div>
        <button 
          onClick={() => window.location.href = "/dashboard"}
          className="text-primary font-bold text-sm uppercase tracking-widest hover:opacity-70"
        >
          View My Requests
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-[3rem] p-8 border border-white shadow-ambient space-y-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">Select Item</label>
          <select 
            name="type" 
            required
            className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/30 transition-all font-medium appearance-none"
          >
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            {options.length === 0 && <option value="Custom Item">Custom Item</option>}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">VRFS ID</label>
            <input 
              name="vrfsId"
              type="text" 
              required
              placeholder="e.g. B-123-456"
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/30 transition-all font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant ml-4">Discord Proof Link</label>
            <input 
              name="proofUrl"
              type="url" 
              required
              placeholder="https://discord.com/channels/..."
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-6 py-4 outline-none focus:border-primary/30 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 bg-error/10 text-error rounded-xl flex items-center gap-3 text-sm font-bold">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <GlassButton type="submit" disabled={loading} variant="primary" className="w-full py-6 group">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 
         <>
            Submit Verification
            <Send className="w-4 h-4 ml-2 opacity-30 group-hover:opacity-100 transition-opacity" />
         </>}
      </GlassButton>
    </form>
  );
}
