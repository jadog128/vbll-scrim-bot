import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export default function GlassButton({ children, className, variant = "primary", size = "md", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-container hover:shadow-ambient",
    secondary: "bg-secondary text-white hover:bg-secondary-container hover:shadow-ambient",
    outline: "bg-transparent border border-outline-variant text-on-surface-variant hover:bg-surface-container-high",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      className={cn(
        "rounded-2xl font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        {children}
      </div>
    </button>
  );
}
