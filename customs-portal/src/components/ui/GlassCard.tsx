import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300",
      hover && "hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-blue-500/10",
      className
    )}>
      {/* Subtle overlay gradient */}
      <div className="pointer-events-none absolute -left-1/2 -top-1/2 h-[200%] w-[200%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
