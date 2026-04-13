import { ShellFrame } from "@/components/shell-frame";
import { StatusBadge } from "@/components/status-badge";
import { getSources } from "@/lib/api";

export default async function SourcesPage() {
  const sources = await getSources();

  return (
    <ShellFrame activePath="/sources" eyebrow="Operational visibility" title="Source Monitor">
      <div className="grid gap-4 xl:grid-cols-2">
        {sources.map((source) => (
          <div key={source.slug} className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">{source.source_type}</p>
                <h2 className="mt-2 text-xl text-white">{source.name}</h2>
                <p className="mt-2 text-sm text-white/45">{source.slug}</p>
              </div>
              <StatusBadge value={source.enabled ? "authorized" : "non_compliant"} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Artifacts</p>
                <p className="mt-3 text-3xl text-white">{source.artifact_count}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Last artifact</p>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  {source.last_artifact_at ? new Date(source.last_artifact_at).toLocaleString() : "source unavailable"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Last event</p>
                <p className="mt-3 text-sm leading-7 text-white/70">{source.last_run_status ?? "source unavailable"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ShellFrame>
  );
}
