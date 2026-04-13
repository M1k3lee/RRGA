import Link from "next/link";
import { Activity, BellRing, Braces, Building2, Key, ShieldCheck, Wallet } from "lucide-react";

import { ContextDock, ContextDockSection, DockMetric } from "@/components/context-dock";
import { ShellFrame } from "@/components/shell-frame";

const endpointGroups = [
  {
    title: "Search and lookup",
    summary: "Resolve a company, token, domain, contract, wallet, or jurisdiction before a workflow makes a decision.",
    routes: ["GET /search", "GET /check/entity", "GET /check/domain", "GET /check/contract", "GET /check/wallet"],
  },
  {
    title: "Investigation data",
    summary: "Pull the evidence, timeline, and relationship views that back the answer layer.",
    routes: ["GET /entity/:id", "GET /entity/:id/evidence", "GET /entity/:id/graph", "GET /entity/:id/timeline"],
  },
  {
    title: "Monitoring and operations",
    summary: "Store watch targets, trigger alerts, and inspect source health from the same commercial surface.",
    routes: ["POST /watchlists", "POST /alerts/test", "GET /sources", "GET /health"],
  },
] as const;

const monetizationLayers = [
  {
    title: "Listing and integration gates",
    body: "Put legitimacy checks in front of token listings, issuer approvals, partner reviews, and high-risk integrations.",
    icon: Building2,
  },
  {
    title: "Embedded warnings and evidence",
    body: "Return evidence bundles and trust signals inside analyst tooling, internal ops consoles, and customer-facing flows.",
    icon: ShieldCheck,
  },
  {
    title: "Monitoring as subscription value",
    body: "Move from one-off lookups into watchlists, alerts, and change monitoring that justify recurring revenue.",
    icon: BellRing,
  },
] as const;

const deliveryPillars = [
  {
    title: "Authentication and control",
    body: "API keys, rate-aware delivery, and product packaging that can scale from prototypes to enterprise rollout.",
    icon: Key,
  },
  {
    title: "Evidence-first responses",
    body: "Checks can return source metadata, timestamps, and field-level provenance instead of opaque risk labels.",
    icon: Activity,
  },
] as const;

export default function ApiPage() {
  return (
    <ShellFrame
      activePath="/api"
      eyebrow="Embed legitimacy and regulatory checks into your platform"
      title="API"
      dock={
        <ContextDock
          eyebrow="Commercial layer"
          title="The monetization surface"
          summary="The visual product creates conviction. The API is what turns that conviction into recurring workflow value."
          actions={[
            { label: "View plans", href: "/pricing", tone: "primary" },
            { label: "Open docs", href: "/docs" },
          ]}
        >
          <ContextDockSection title="Why teams pay">
            <div className="grid gap-3">
              <DockMetric label="Legitimacy checks" value="Inline in exchange, wallet, and ops workflows" tone="positive" />
              <DockMetric label="Evidence bundles" value="Explainable outputs for investigations and audits" />
              <DockMetric label="Monitoring" value="Watchlists and alerts create recurring value" tone="warning" />
            </div>
          </ContextDockSection>
        </ContextDock>
      }
    >
      <div className="space-y-5">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">API positioning</p>
          <h2 className="mt-4 font-[var(--font-display)] text-3xl text-white">
            The API product behind the regulatory intelligence layer for crypto.
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-white/65">
            Use the VOTO API to search entities, run legitimacy checks, retrieve evidence bundles, inspect timelines of
            change, traverse connected relationships, and monitor high-priority watchlists directly inside production
            workflows.
          </p>
          <p className="mt-3 text-sm leading-7 text-white/55">
            VOTO surfaces trust and oversight signals for crypto platforms without hiding the source evidence behind a
            black-box score.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
            >
              <Braces className="h-4 w-4" />
              Open docs
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
            >
              View plans
            </Link>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          {monetizationLayers.map((layer) => {
            const Icon = layer.icon;
            return (
              <section key={layer.title} className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Icon className="h-4 w-4 text-cyan-200" />
                  {layer.title}
                </div>
                <p className="mt-4 text-sm leading-7 text-white/62">{layer.body}</p>
              </section>
            );
          })}
        </div>

        <div id="endpoint-library" className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Endpoint library</p>
            <div className="mt-4 space-y-4">
              {endpointGroups.map((group) => (
                <div key={group.title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <h3 className="text-lg text-white">{group.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/60">{group.summary}</p>
                  <div className="mt-3 space-y-2">
                    {group.routes.map((route) => (
                      <div key={route} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/80">
                        {route}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Example schema only</p>
              <pre className="mt-4 overflow-x-auto rounded-[24px] bg-black/35 p-4 text-xs text-cyan-100/80">
{`{
  "entity_type": "contract",
  "signals": {
    "regulatory_status": "source-backed status or source unavailable",
    "sanctions_exposure": "present | none | source unavailable",
    "warning_signals": 0,
    "coverage": "official | enrichment | mixed"
  },
  "evidence": [],
  "relationships": [],
  "latest_update": "timestamp"
}`}
              </pre>
              <p className="mt-4 text-sm leading-7 text-white/60">
                This schema block is illustrative only. Live responses come from source-backed intelligence, not fabricated records.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Building2 className="h-4 w-4 text-cyan-200" />
                  Exchanges
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">Pre-listing due diligence and entity screening inside approval workflows.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Wallet className="h-4 w-4 text-cyan-200" />
                  Wallets and apps
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">Legitimacy checks for onboarding, partner reviews, and user-facing warnings.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <ShieldCheck className="h-4 w-4 text-cyan-200" />
                  Compliance systems
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">Evidence bundles, monitoring, and source-backed intelligence for investigations.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {deliveryPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <section key={pillar.title} className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-2 text-sm text-white">
                  <Icon className="h-4 w-4 text-cyan-200" />
                  {pillar.title}
                </div>
                <p className="mt-4 text-sm leading-7 text-white/62">{pillar.body}</p>
              </section>
            );
          })}
        </div>
      </div>
    </ShellFrame>
  );
}
