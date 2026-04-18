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
      "rounded-[2.5rem] bg-surface-container-lowest p-8 shadow-ambient border border-white transition-all duration-300",
      hover && "hover:shadow-floating hover:translate-y-[-4px]",
      className
    )}>
      {children}
    </div>
  );
}
