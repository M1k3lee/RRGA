import Link from "next/link";
import { ArrowRight, Braces, Database, ShieldCheck, Siren, Waypoints } from "lucide-react";

import { HeroLookup } from "@/components/hero-lookup";
import { MarketingNav } from "@/components/marketing-nav";
import { SourceConstellationShell } from "@/components/source-constellation-shell";
import { getSources } from "@/lib/api";

const explanationSteps = [
  {
    title: "Input any crypto entity",
    body: "Search a project, issuer, token, domain, contract, wallet, or jurisdiction from one entry point.",
  },
  {
    title: "See regulatory, warning, and sanctions signals",
    body: "The answer layer surfaces register coverage, warning signals, sanctions exposure, and source coverage immediately.",
  },
  {
    title: "Investigate evidence and relationships",
    body: "Drill into linked domains, contracts, jurisdictions, timeline changes, and source-backed evidence.",
  },
];

const audienceCards = [
  {
    title: "Exchanges",
    job: "Run pre-listing due diligence before adding a token, issuer, or counterparty to your platform.",
  },
  {
    title: "Funds",
    job: "Screen projects and issuers before investment committee review, treasury exposure, or partnership approval.",
  },
  {
    title: "Compliance teams",
    job: "Move faster on investigations by unifying registers, sanctions signals, warnings, and evidence trails in one place.",
  },
  {
    title: "Builders",
    job: "Embed legitimacy and risk checks into wallets, apps, listing workflows, and internal risk systems through the API.",
  },
];

const lookupTypes = [
  {
    title: "Company / legal entity",
    returns: "Regulatory status, jurisdictions, warnings, sanctions links, evidence, and timeline changes.",
  },
  {
    title: "Token / issuer",
    returns: "Issuer coverage, linked contracts, project links, source provenance, and connected evidence.",
  },
  {
    title: "Domain",
    returns: "Linked entities, warning context, connected records, and source-backed domain evidence.",
  },
  {
    title: "Contract",
    returns: "Chain, address, linked entities, verification context where available, and connected graph relationships.",
  },
  {
    title: "Wallet",
    returns: "Observed labels, linked entities, connected warnings or sanctions context, and relationship evidence.",
  },
  {
    title: "Jurisdiction",
    returns: "Linked entities, register activity, warning coverage, and country-level regulatory context.",
  },
];

const apiUseCases = [
  "Screen listings inside exchange workflows before approval.",
  "Flag high-risk entities inside wallet and app onboarding.",
  "Attach evidence bundles to internal compliance investigations.",
  "Monitor watchlists and trigger alerts when source-backed status changes.",
];

export default async function LandingPage() {
  const sources = await getSources();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,53,70,0.26),_transparent_24%),linear-gradient(180deg,_#061019,_#05090d_38%,_#020406)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <MarketingNav activePath="/" />

        <section className="mt-4 overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.025))] p-6 shadow-[0_50px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.36em] text-cyan-100/55">
                  VOTO | The regulatory intelligence layer for crypto
                </p>
                <h1 className="mt-5 max-w-5xl font-[var(--font-display)] text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Know if a crypto project is legitimate, instantly.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-9 text-white/72">
                  Use live regulatory, sanctions, and entity intelligence to assess crypto projects, issuers, wallets,
                  domains, and contracts through a visual investigation layer or developer API.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">What VOTO is</p>
                  <p className="mt-3 text-sm leading-7 text-white/75">Exchanges, funds, compliance teams, and crypto infrastructure buyers.</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Core output</p>
                  <p className="mt-3 text-sm leading-7 text-white/75">Regulatory status, warning signals, sanctions exposure, evidence, and relationships.</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Why the graph exists</p>
                  <p className="mt-3 text-sm leading-7 text-white/75">To investigate connected evidence fast after the initial legitimacy check is complete.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <HeroLookup />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">What matters first</p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-white/65">
                    <li>Is this entity in an official register?</li>
                    <li>Are there warning or sanctions signals attached?</li>
                    <li>What evidence supports the conclusion?</li>
                  </ul>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Live source coverage</p>
                  <p className="mt-4 text-5xl font-semibold text-white">{sources.length}</p>
                  <p className="mt-3 text-sm leading-7 text-white/60">
                    Only live, configured sources are shown here. If a source is unavailable, the interface says so.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          {explanationSteps.map((step, index) => (
            <div key={step.title} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.18)]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/45">Step {index + 1}</p>
              <h2 className="mt-3 text-xl text-white">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/62">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/45">Who it&apos;s for</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl text-white">Built around real due-diligence jobs.</h2>
            <p className="mt-4 text-sm leading-8 text-white/65">
              This is a serious product for teams that need to decide whether to list, invest in, integrate, or
              investigate a crypto entity with source-backed confidence.
            </p>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-4">
            {audienceCards.map((card) => (
              <div key={card.title} className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <h3 className="text-xl text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/62">{card.job}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/45">What you can check</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl text-white">One lookup surface, multiple entity types.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/65">
              Every lookup type leads back to the same core answer layer: regulatory status, sanctions exposure,
              warning signals, linked entities, source evidence, and change history where available.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {lookupTypes.map((item) => (
                <div key={item.title} className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                  <h3 className="text-lg text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/62">{item.returns}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Investigate legitimacy through connected evidence</p>
            <div className="mt-4 overflow-hidden rounded-[32px] border border-white/10 bg-black/25">
              <SourceConstellationShell sources={sources} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Waypoints className="h-4 w-4 text-cyan-200" />
                  Follow the entity, not just the label
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Move from a project or contract into linked domains, contracts, warnings, and jurisdictions without
                  losing provenance.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Siren className="h-4 w-4 text-cyan-200" />
                  Warnings and sanctions stay visible
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Negative signals are kept distinct from enrichment data so investigators can see risk context clearly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/45">Why this exists</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl text-white">Crypto legitimacy checks are fragmented by default.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-red-100/70">Problem</p>
                <p className="mt-3 text-sm leading-7 text-red-100/80">
                  Teams jump across registers, warnings, sanctions datasets, websites, and public metadata just to form
                  a baseline view of legitimacy and risk.
                </p>
              </div>
              <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/70">Solution</p>
                <p className="mt-3 text-sm leading-7 text-emerald-100/80">
                  VOTO unifies those signals into one explainable intelligence layer with a fast answer surface,
                  evidence vault, and graph-driven investigation path.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-black/20 p-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Live data and trust</p>
            <h2 className="mt-4 font-[var(--font-display)] text-4xl text-white">Real data only. Every field traceable.</h2>
            <div className="mt-6 space-y-3">
              {sources.map((source) => (
                <div key={source.slug} className="flex items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-sm text-white">{source.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{source.source_type}</p>
                  </div>
                  <div className="text-right text-xs text-white/45">
                    <p>{source.artifact_count} artifacts</p>
                    <p className="mt-1">{source.last_run_status ?? "source unavailable"}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <ShieldCheck className="h-4 w-4 text-cyan-200" />
                  Official sources win
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  ESMA and OFAC records outrank enrichment layers. Inferred links never overwrite official facts.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Database className="h-4 w-4 text-cyan-200" />
                  Evidence-first logic
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Publication dates, fetch times, field paths, and direct source links stay attached to the intelligence layer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.05),_rgba(255,255,255,0.025))] p-6">
          <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/45">API-first product</p>
              <h2 className="mt-4 font-[var(--font-display)] text-4xl text-white">
                Embed crypto legitimacy and regulatory checks into your platform.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/65">
                The visual interface is for investigations. The API is for production workflows inside exchanges,
                wallets, compliance tooling, and internal risk systems.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {apiUseCases.map((item) => (
                  <div key={item} className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/api"
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  Get API access
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
                >
                  Open technical docs
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/25 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Example schema only</p>
                <Braces className="h-5 w-5 text-cyan-200" />
              </div>
              <pre className="mt-4 overflow-x-auto rounded-[24px] bg-black/40 p-4 text-xs text-cyan-100/80">
{`{
  "query": "input value",
  "entity_type": "brand | legal_entity | contract | wallet | domain",
  "signals": {
    "regulatory_status": "source-backed status or source unavailable",
    "sanctions_exposure": "present | none | source unavailable",
    "warning_signals": 0,
    "coverage": "official | enrichment | mixed"
  },
  "evidence": [
    {
      "source": "source slug",
      "source_type": "register | sanctions | market_metadata",
      "field_path": "exact matched field",
      "published_at": "timestamp"
    }
  ],
  "relationships": {
    "linked_domains": [],
    "linked_contracts": [],
    "linked_wallets": []
  }
}`}
              </pre>
              <p className="mt-4 text-sm leading-7 text-white/58">
                The API is designed for search, legitimacy checks, evidence bundles, timeline inspection, relationship
                retrieval, monitoring, and alerts.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[38px] border border-white/10 bg-black/20 p-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/45">Final call to action</p>
              <h2 className="mt-4 font-[var(--font-display)] text-4xl text-white">
                Run legitimacy checks before you list, invest, or integrate.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/65">
                VOTO gives serious teams a source-backed answer layer, a connected investigation surface, and an API
                they can operationalize inside real workflows.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <Link
                href="/api"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Request API access
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/lookup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
              >
                Explore live intelligence
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
