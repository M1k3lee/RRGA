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

export function TrustBadge({ name, status, tone, lastUpdated, className }: TrustBadgeProps) {
  const config = {
    clear: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      text: "text-cyan-100",
      icon: ShieldCheck,
      glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-100",
      icon: AlertTriangle,
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    },
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-100",
      icon: AlertTriangle,
      glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
    },
    neutral: {
      bg: "bg-white/5",
      border: "border-white/10",
      text: "text-white/70",
      icon: Info,
      glow: "",
    },
  }[tone];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "group relative flex w-full max-w-[320px] flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all hover:scale-[1.02]",
        config.bg,
        config.border,
        config.glow,
        className
      )}
    >
      {/* Decorative Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className="relative p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={cn("rounded-lg p-1.5", config.bg, "border", config.border)}>
              <Icon className={cn("h-4 w-4", config.text)} />
            </div>
            <div>
              <p className={cn("text-[10px] uppercase tracking-[0.2em]", config.text)}>VOTO Verified</p>
              <h4 className="text-sm font-semibold text-white mt-0.5">{name}</h4>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn("text-[11px] font-medium", config.text)}>{status}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5">
             <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
             <span className="text-[9px] uppercase tracking-widest text-white/40">Live Intel</span>
          </div>
          {lastUpdated && (
            <span className="text-[10px] text-white/30 italic">Updated {lastUpdated}</span>
          )}
        </div>
      </div>
      
      {/* VOTO Brand Stripe */}
      <div className="bg-white/5 px-4 py-1.5 flex items-center justify-end border-t border-white/5">
        <span className="text-[8px] uppercase tracking-[0.4em] text-white/25">Oversight & Trust Oracle</span>
      </div>
    </div>
  );
}
