"use client";

import { useEffect, useState } from "react";
import DraggableGrid from "./DraggableGrid";
import { TrendChart, ActivityChart, OutcomeChart } from "./AdminAnalytics";

interface DashboardManagerProps {
  guildId: string;
  stats: React.ReactNode;
  deployments: React.ReactNode;
  management: React.ReactNode;
}

export default function DashboardManager({ guildId, stats, deployments, management }: DashboardManagerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/analytics?guild=${guildId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      });
  }, [guildId]);

  if (loading) return <div className="h-96 flex items-center justify-center animate-pulse text-on-surface-variant font-bold">Initializing Dashboard...</div>;

  const leftContent = [
    { id: 'trends', content: <TrendChart data={data} /> },
    { id: 'deployments', content: deployments },
  ];

  const rightContent = [
    { id: 'activity', content: <ActivityChart data={data} /> },
    { id: 'management', content: management },
  ];

  // Outcome chart usually looks better full width or at the end
  // I'll add it to the column that is shorter or just add a global "bottom" area
  // For now, I'll add it to the right column
  rightContent.push({ id: 'outcome', content: <OutcomeChart data={data} /> });

  return (
    <div className="space-y-10">
        <div className="animate-in fade-in duration-700">
            {stats}
        </div>
        <DraggableGrid 
            guildId={guildId}
            leftContent={leftContent}
            rightContent={rightContent}
        />
    </div>
  );
}
