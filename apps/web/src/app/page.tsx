import Link from "next/link";
import { ArrowRight, Orbit, Radar, ShieldCheck, Telescope } from "lucide-react";

import { SourceConstellation } from "@/components/source-constellation";
import { getSources } from "@/lib/api";

export default async function LandingPage() {
  const sources = await getSources();

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_140px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.36em] text-cyan-100/50">Regulatory Gravity</p>
              <h1 className="mt-5 max-w-4xl font-[var(--font-display)] text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                A live cartography of crypto regulatory reality.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-9 text-white/68">
                Regulatory Register Graph API turns fragmented public registers, sanctions data, token metadata, and
                address intelligence into one evidence-backed universe. No synthetic records. No invented statuses.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explorer"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Enter explorer
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sources"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
              >
                Inspect source health
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Official-first conflict policy",
                  body: "Regulators and official sanctions datasets always outrank enrichment layers.",
                },
                {
                  icon: Telescope,
                  title: "Temporal evidence vault",
                  body: "Every material field is traceable to a source artifact and publication moment.",
                },
                {
                  icon: Orbit,
                  title: "Graph-native exploration",
                  body: "Entities, domains, contracts, notices, and records stay visible as linked objects.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <Icon className="h-5 w-5 text-cyan-200" />
                  <p className="mt-4 text-sm text-white">{title}</p>
                  <p className="mt-2 text-sm leading-7 text-white/55">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[32px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Authority Layer</p>
                  <p className="mt-2 text-sm text-white/65">The landing constellation is built only from configured live sources.</p>
                </div>
                <Radar className="h-5 w-5 text-cyan-200" />
              </div>
              <div className="mt-4">
                <SourceConstellation sources={sources} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Opening questions</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-white/65">
                  <li>Is this crypto company authorized anywhere?</li>
                  <li>Has this issuer appeared in the MiCA register?</li>
                  <li>Does this domain connect to a known sanctions or warning record?</li>
                </ul>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Current source count</p>
                <p className="mt-4 text-5xl font-semibold text-white">{sources.length}</p>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  Source modules bootstrap in an empty database, but graph objects only appear after real ingestion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
