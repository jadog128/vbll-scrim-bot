import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function GlassButton({ 
  children, 
  className, 
  variant = 'secondary', 
  size = 'md',
  ...props 
}: GlassButtonProps) {
  const variants = {
    primary: "bg-blue-600/80 text-white border-blue-400/30 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]",
    secondary: "bg-white/10 text-white border-white/20 hover:bg-white/20",
    danger: "bg-red-600/80 text-white border-red-400/30 hover:bg-red-500",
    ghost: "bg-transparent text-white/70 border-transparent hover:text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button 
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border font-medium backdrop-blur-md transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
