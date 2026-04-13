import { Database, ShieldCheck, Waypoints } from "lucide-react";

const defaultItems = [
  {
    title: "Source-backed facts",
    body: "Register records, warnings, sanctions entries, and evidence excerpts only appear when a source artifact supports them.",
    tone: "fact" as const,
    icon: ShieldCheck,
  },
  {
    title: "Confidence-scored relationships",
    body: "Linked entities, domains, contracts, and wallets can carry matching confidence, but they never overwrite official facts.",
    tone: "inference" as const,
    icon: Waypoints,
  },
  {
    title: "Coverage boundaries stay visible",
    body: "If the system has narrow coverage or a missing source, the interface says so instead of inventing certainty.",
    tone: "coverage" as const,
    icon: Database,
  },
] as const;

export function TrustLegend({
  title = "Trust model",
  items = defaultItems,
}: {
  title?: string;
  items?: typeof defaultItems;
}) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          const toneClasses =
            item.tone === "fact"
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
              : item.tone === "inference"
                ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                : "border-white/10 bg-white/5 text-white/80";

          return (
            <div key={item.title} className={`rounded-2xl border p-4 ${toneClasses}`}>
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4" />
                {item.title}
              </div>
              <p className="mt-3 text-sm leading-7">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
