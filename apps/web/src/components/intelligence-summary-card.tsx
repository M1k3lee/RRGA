import { ArrowRight, BellRing, Braces, Clock3, ShieldCheck, Waypoints } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { formatTimestamp } from "@/lib/format";
import { toneClasses } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  href: string;
  icon: "evidence" | "graph" | "timeline" | "watch" | "api";
  disabled?: boolean;
};

const iconMap = {
  evidence: ShieldCheck,
  graph: Waypoints,
  timeline: Clock3,
  watch: BellRing,
  api: Braces,
} as const;

export function IntelligenceSummaryCard({
  eyebrow,
  title,
  entityType,
  summaryTitle,
  summaryBody,
  tone,
  status,
  confidenceLabel,
  latestUpdate,
  facts,
  actions,
  body,
}: {
  eyebrow: string;
  title: string;
  entityType: string;
  summaryTitle: string;
  summaryBody: string;
  tone: "clear" | "watch" | "critical" | "limited";
  status?: string | null;
  confidenceLabel: string;
  latestUpdate?: string | null;
  facts: Array<{ label: string; value: string }>;
  actions: Action[];
  body?: string | null;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.07),_rgba(255,255,255,0.03))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">{eyebrow}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="font-[var(--font-display)] text-3xl font-semibold text-white">{title}</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/65">
              {entityType.replaceAll("_", " ")}
            </span>
            <StatusBadge value={status ?? undefined} />
          </div>
          <div className={cn("mt-4 inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em]", toneClasses(tone))}>
            {summaryTitle}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">{summaryBody}</p>
          {body ? <p className="mt-4 max-w-3xl text-sm leading-7 text-white/58">{body}</p> : null}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Confidence</p>
          <p className="mt-2 text-sm text-white">{confidenceLabel}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/45">Latest update</p>
          <p className="mt-2 text-sm text-white/75">{formatTimestamp(latestUpdate)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{fact.label}</p>
            <p className="mt-3 text-sm text-white">{fact.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = iconMap[action.icon];
          if (action.disabled) {
            return (
              <span
                key={action.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/35"
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </span>
            );
          }

          return (
            <a
              key={action.label}
              href={action.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                action.icon === "watch"
                  ? "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                  : "border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
