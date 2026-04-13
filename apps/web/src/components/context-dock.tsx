import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ContextDock({
  eyebrow,
  title,
  summary,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
  actions?: Array<{ label: string; href: string; tone?: "primary" | "secondary" | "warning" }>;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">{eyebrow}</p>
        <h2 className="mt-3 font-[var(--font-display)] text-2xl text-white">{title}</h2>
        {summary ? <p className="mt-3 text-sm leading-7 text-white/62">{summary}</p> : null}
        {actions?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((action) => (
              <a
                key={action.label}
                href={action.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                  action.tone === "primary" &&
                    "border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15",
                  action.tone === "warning" &&
                    "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
                  (!action.tone || action.tone === "secondary") &&
                    "border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:text-white",
                )}
              >
                {action.label}
                <ArrowRight className="h-4 w-4" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ContextDockSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DockMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        tone === "positive" && "border-emerald-400/20 bg-emerald-500/10",
        tone === "warning" && "border-amber-400/20 bg-amber-500/10",
        tone === "neutral" && "border-white/10 bg-black/20",
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
