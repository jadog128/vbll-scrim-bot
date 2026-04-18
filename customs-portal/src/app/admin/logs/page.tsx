"use client";

import { useEffect, useState } from "react";
import { Shield, Clock, User, Info } from "lucide-react";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter">Staff Activity Audit</h1>
          <p className="text-on-surface-variant font-medium">Real-time log of administrative decisions.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-outline-variant/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 border-b border-outline-variant/10 pb-4">
              <th className="pb-4 px-4">Timestamp</th>
              <th className="pb-4">Staff Member</th>
              <th className="pb-4">Action</th>
              <th className="pb-4">Target ID</th>
              <th className="pb-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {logs.map((log: any) => (
              <tr key={log.id} className="text-sm group hover:bg-surface-container-lowest transition-colors">
                <td className="py-4 px-4 text-[11px] font-mono text-on-surface-variant">
                   {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="py-4 font-bold text-primary flex items-center gap-2">
                   <User className="w-3.5 h-3.5" /> {log.staff_name}
                </td>
                <td className="py-4">
                   <span className="px-2.5 py-1 bg-surface-container-high rounded-lg text-[10px] font-black uppercase">
                      {log.action}
                   </span>
                </td>
                <td className="py-4 font-bold">#{log.target_id}</td>
                <td className="py-4 text-on-surface-variant text-[12px]">{log.details}</td>
              </tr>
            ))}

            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-on-surface-variant/40 italic">
                   No logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
