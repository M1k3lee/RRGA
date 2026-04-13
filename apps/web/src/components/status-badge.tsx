import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  authorized: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  sanctioned: "border-red-400/40 bg-red-500/10 text-red-200",
  non_compliant: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  whitepaper_notified: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  market_metadata: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
  contract_observed: "border-violet-400/40 bg-violet-500/10 text-violet-200",
  verified: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  if (!value) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em]",
        toneMap[value] ?? "border-white/10 bg-white/5 text-white/70",
        className,
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
