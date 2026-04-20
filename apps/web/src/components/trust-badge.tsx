"use client";

import { CheckCircle2, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeTone = "clear" | "warning" | "critical" | "neutral";

export interface TrustBadgeProps {
  name: string;
  status: string;
  tone: BadgeTone;
  lastUpdated?: string;
  className?: string;
}

export function TrustBadge({ name, status, tone, className }: TrustBadgeProps) {
  const config = {
    clear: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/40",
      text: "text-emerald-400",
      accent: "bg-emerald-400",
      icon: ShieldCheck,
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
    },
    warning: {
      bg: "bg-amber-500/15",
      border: "border-amber-500/40",
      text: "text-amber-400",
      accent: "bg-amber-400",
      icon: AlertTriangle,
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
    },
    critical: {
      bg: "bg-red-500/15",
      border: "border-red-500/40",
      text: "text-red-400",
      accent: "bg-red-400",
      icon: AlertTriangle,
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    },
    neutral: {
      bg: "bg-white/5",
      border: "border-white/20",
      text: "text-white/60",
      accent: "bg-white/40",
      icon: Info,
      glow: "",
    },
  }[tone];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group relative flex items-center h-12 w-full max-w-[240px] pl-1 pr-4 rounded-full border backdrop-blur-md transition-all hover:scale-[1.03] active:scale-[0.98]",
        config.bg,
        config.border,
        config.glow,
        className
      )}
    >
      <div className={cn("flex items-center justify-center h-9 w-9 rounded-full", config.accent, "bg-opacity-20")}>
        <Icon className={cn("h-5 w-5", config.text)} />
      </div>
      
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 leading-none mb-1">VOTO Verified</p>
        <h4 className="text-[13px] font-bold text-white truncate leading-none">
          {name}
        </h4>
      </div>

      <div className="ml-2 flex items-center">
        <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config.accent)} />
      </div>
    </div>
  );
}
