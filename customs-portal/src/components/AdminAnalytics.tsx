"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, Clock, CheckCircle2 } from "lucide-react";

interface AnalyticsData {
  trends: { day: string; count: number }[];
  peakHours: { hour: string; count: number }[];
  approvalStats: { status: string; count: number }[];
}

export default function AdminAnalytics({ guildId }: { guildId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/analytics?guild=${guildId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      });
  }, [guildId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-white/50 rounded-[2.5rem] border-2 border-dashed border-outline-variant/10" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b"];

  const pieData = data.approvalStats.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
  }));

  const trendData = data.trends.map(d => ({
    ...d,
    day: new Date(d.day).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Request Trends */}
        <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-outline-variant/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">Request Trends</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  dot={{ r: 6, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Activity */}
        <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-outline-variant/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-error/5 rounded-2xl flex items-center justify-center text-error">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">Peak Activity</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                <Tooltip 
                   contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Approval Stats */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-outline-variant/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500/5 rounded-2xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-on-surface tracking-tightest">Outcome Distribution</h3>
        </div>
        <div className="h-80 w-full flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
                {pieData.map((d, i) => (
                    <div key={i} className="p-6 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/5">
                        <span className="text-sm font-bold text-on-surface-variant block mb-1 uppercase tracking-widest">{d.name}</span>
                        <span className="text-3xl font-black text-on-surface">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
