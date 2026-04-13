import { Clock3, ExternalLink, FileCode2, ShieldCheck } from "lucide-react";

import { formatTimestamp } from "@/lib/format";

export function EvidenceCard({
  sourceName,
  sourceType,
  snippet,
  fieldPath,
  timestamp,
  uri,
  badge = "Source-backed fact",
}: {
  sourceName: string;
  sourceType?: string | null;
  snippet: string;
  fieldPath?: string | null;
  timestamp?: string | null;
  uri?: string | null;
  badge?: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.03))] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-100">
          <ShieldCheck className="h-3.5 w-3.5" />
          {badge}
        </span>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-white/45">
          {sourceName}
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-white/78">{snippet}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
            <Clock3 className="h-3.5 w-3.5" />
            Publication trail
          </div>
          <p className="mt-2 text-sm text-white/75">{formatTimestamp(timestamp)}</p>
          <p className="mt-1 text-xs text-white/45">{sourceType ?? "source unavailable"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
            <FileCode2 className="h-3.5 w-3.5" />
            Matching field
          </div>
          <p className="mt-2 text-sm text-white/75">{fieldPath ?? "source unavailable"}</p>
        </div>
      </div>

      {uri ? (
        <a
          href={uri}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-cyan-100"
        >
          Open source
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
    </article>
  );
}
