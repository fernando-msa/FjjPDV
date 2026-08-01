import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "danger";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const variantClasses: Record<BadgeVariant, string> = {
    default: "bg-primary/15 text-primary border border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border border-white/10",
    outline: "bg-transparent text-muted-foreground border border-border",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-500/25",
    danger: "bg-red-500/15 text-red-300 border border-red-500/25"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}