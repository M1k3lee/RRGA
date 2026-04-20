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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,53,70,0.32),_transparent_32%),_#020406] text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
        <MarketingNav activePath="/" />

        {/* Hero Section */}
        <section className="relative mt-8 py-12 lg:py-20 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pr-4 pl-1.5 py-1.5 mb-8">
            <div className="rounded-full bg-cyan-400 px-2.5 py-0.5 text-[10px] font-bold text-black uppercase">Live</div>
            <span className="text-xs text-white/60 tracking-wider">Regulatory intel layer for the crypto economy</span>
          </div>
          
          <h1 className="max-w-4xl font-[var(--font-display)] text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Verify any crypto project. Instantly.
          </h1>
          
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/55">
            The definitive answer layer for regulatory status, sanctions, and entity evidence. Search a token, issuer, wallet, or domain to uncover source-backed links.
          </p>

          <div className="mt-12 w-full max-w-2xl px-4">
            <HeroLookup />
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Intelligence Layer */}
          <div className="relative col-span-2 overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.025))] p-8 backdrop-blur-xl">
             <div className="flex items-center gap-3 mb-6">
               <ShieldCheck className="h-6 w-6 text-cyan-400" />
               <h3 className="text-xl font-semibold">Intelligence Layer</h3>
             </div>
             <p className="text-sm leading-8 text-white/50 mb-8">
               Unified access to official registers (ESMA), sanctions lists (OFAC), and market metadata. Evidence-first logic ensures every claim is traceable to a timestamped source.
             </p>
             <div className="grid grid-cols-2 gap-3">
                {sources.slice(0, 4).map(s => (
                  <div key={s.slug} className="rounded-2xl border border-white/5 bg-white/5 p-3 flex items-center justify-between">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{s.name}</span>
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </div>
                ))}
             </div>
          </div>

          {/* Graph Explorer */}
          <div className="col-span-2 lg:col-span-1 rounded-[40px] border border-white/10 bg-black/20 p-8 flex flex-col justify-between group transition-all hover:bg-black/30">
            <div>
              <Waypoints className="h-6 w-6 text-purple-400 mb-6" />
              <h3 className="text-xl font-semibold mb-4">Graph Explorer</h3>
              <p className="text-sm leading-7 text-white/50">
                Uncover invisible links. Follow entities across domains, contracts, and jurisdictions without losing context.
              </p>
            </div>
            <Link href="/graph" className="mt-8 flex items-center gap-2 text-xs text-purple-400 uppercase tracking-widest font-bold">
               Explore Graph <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Developer API */}
          <div className="col-span-2 lg:col-span-1 rounded-[40px] border border-white/10 bg-black/20 p-8 flex flex-col justify-between group transition-all hover:bg-black/30">
            <div>
              <Braces className="h-6 w-6 text-emerald-400 mb-6" />
              <h3 className="text-xl font-semibold mb-4">Developer API</h3>
              <p className="text-sm leading-7 text-white/50">
                Operationalize legitimacy. Embed checks into exchanges, wallets, and compliance workflows.
              </p>
            </div>
            <Link href="/docs" className="mt-8 flex items-center gap-2 text-xs text-emerald-400 uppercase tracking-widest font-bold">
               API Docs <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Evidence Logic */}
          <div className="col-span-2 rounded-[40px] border border-white/10 bg-white/[0.03] p-8 flex flex-col lg:flex-row gap-8 items-center">
             <div className="flex-1">
               <Database className="h-6 w-6 text-amber-400 mb-6" />
               <h3 className="text-xl font-semibold mb-4">Evidence Vault</h3>
               <p className="text-sm leading-8 text-white/50">
                 No inferred claims without proof. Every status profile links directly to official publication dates, direct source URLs, and original register fields.
               </p>
             </div>
             <div className="w-full lg:w-48 p-4 rounded-3xl border border-white/5 bg-black/40 text-[10px] font-mono text-white/30 truncate">
               {`{ "source": "ESMA_MICA", "verified": true }`}
             </div>
          </div>

          {/* Sources Ticker */}
          <div className="col-span-2 rounded-[40px] border border-white/10 bg-black/20 overflow-hidden relative p-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-6">Active Intelligence Sources</p>
            <div className="flex flex-wrap gap-3">
              {sources.map(s => (
                <div key={s.slug} className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] text-white/60">
                  {s.name}
                </div>
              ))}
            </div>
            <div className="absolute right-8 bottom-8 text-3xl font-bold text-white/10">
              {sources.length}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16 mb-20 text-center py-20 px-4 rounded-[48px] border border-white/10 bg-[linear-gradient(135deg,_rgba(6,182,212,0.1),_transparent)]">
          <h2 className="text-4xl font-bold mb-6">Ready to integrate?</h2>
          <p className="text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Join the crypto infrastructure teams using VOTO to automate listing due-diligence and user screening.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
             <Link href="/lookup" className="px-8 py-4 rounded-full bg-white text-black font-bold text-sm tracking-wide hover:bg-white/90 transition-all">
                Search the Registry
             </Link>
             <Link href="/api" className="px-8 py-4 rounded-full border border-white/20 bg-white/5 text-white font-bold text-sm tracking-wide hover:bg-white/10 transition-all">
                Request API Key
             </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
