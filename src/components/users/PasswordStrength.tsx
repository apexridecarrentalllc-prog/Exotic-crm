"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

function getStrength(password: string): { score: number; label: string; variant: "weak" | "fair" | "good" | "strong" } {
  if (!password) return { score: 0, label: "", variant: "weak" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: "Weak", variant: "weak" };
  if (score <= 3) return { score: 2, label: "Fair", variant: "fair" };
  if (score <= 4) return { score: 3, label: "Good", variant: "good" };
  return { score: 4, label: "Strong", variant: "strong" };
}

const variantStyles = {
  weak: "bg-destructive/80",
  fair: "bg-amber-500",
  good: "bg-lime-500",
  strong: "bg-emerald-500",
};

export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  const { score, label, variant } = useMemo(() => getStrength(password), [password]);
  if (!password) return null;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-0.5 h-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              i <= score ? variantStyles[variant] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="font-medium">{label}</span>
      </p>
    </div>
  );
}
