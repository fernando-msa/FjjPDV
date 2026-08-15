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
    success: "bg-accent/15 text-accent border border-accent/30",
    warning: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25",
    danger: "bg-destructive/15 text-destructive border border-destructive/30"
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