import Link from "next/link";

import { ContextDock, ContextDockSection, DockMetric } from "@/components/context-dock";
import { ShellFrame } from "@/components/shell-frame";

const plans = [
  {
    name: "Developer",
    positioning: "For prototypes, internal tools, and solo builders.",
    pricing: "Low monthly pilot tier",
    cta: "Start with API access",
    tone: "neutral" as const,
    features: [
      "Limited monthly checks",
      "Core entity and contract lookups",
      "Basic evidence access",
      "Standard support",
    ],
  },
  {
    name: "Growth",
    positioning: "For startups and smaller teams rolling legitimacy checks into workflows.",
    pricing: "Higher-volume team tier",
    cta: "Scale recurring checks",
    tone: "highlight" as const,
    features: [
      "Higher monthly limits",
      "Watchlists and monitoring",
      "Alert workflows",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    positioning: "For exchanges, compliance teams, funds, and infrastructure buyers.",
    pricing: "Custom commercial plan",
    cta: "Talk to the team",
    tone: "neutral" as const,
    features: [
      "High-volume API access",
      "SLA and onboarding support",
      "Workflow and export support",
      "Custom source roadmap discussions",
    ],
  },
] as const;

const comparisonRows = [
  { label: "Entity and contract checks", values: ["Included", "Included", "Included"] },
  { label: "Evidence bundle access", values: ["Core access", "Expanded access", "Workflow-grade access"] },
  { label: "Watchlists and alerts", values: ["Not included", "Included", "Included with custom workflows"] },
  { label: "Support model", values: ["Standard", "Priority", "SLA and onboarding"] },
  { label: "Commercial fit", values: ["Prototype", "Operational rollout", "Enterprise deployment"] },
] as const;

const procurementSignals = [
  "Plans are structured for API volume, recurring monitoring, and workflow adoption rather than one-off analytics seats.",
  "Pricing copy is intentionally editable so commercial packaging can evolve without rewriting the product story.",
  "Enterprise packaging assumes buyer questions around support, deployment guidance, evidence exports, and roadmap alignment.",
] as const;

export default function PricingPage() {
  return (
    <ShellFrame
      activePath="/pricing"
      eyebrow="Commercial packaging for legitimacy and compliance intelligence"
      title="Pricing"
      dock={
        <ContextDock
          eyebrow="Commercial framing"
          title="Enterprise-ready, still editable"
          summary="This pricing surface is designed to feel procurement-ready now while leaving final commercial numbers flexible."
          actions={[
            { label: "Request API access", href: "/api", tone: "primary" },
            { label: "Open docs", href: "/docs" },
          ]}
        >
          <ContextDockSection title="What buyers are purchasing">
            <div className="grid gap-3">
              <DockMetric label="Recurring checks" value="API and monitoring, not just visual exploration" tone="positive" />
              <DockMetric label="Operational trust" value="Evidence-backed outputs with source provenance" />
              <DockMetric label="Commercial growth" value="Developer to enterprise upgrade path" />
            </div>
          </ContextDockSection>
        </ContextDock>
      }
    >
      <div className="space-y-5">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Packaging</p>
          <h2 className="mt-4 font-[var(--font-display)] text-3xl text-white">API plans built for real compliance workflows.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-white/65">
            VOTO is structured for developer onboarding, growth-stage team adoption, and enterprise deployment. Pricing
            details can be finalized commercially without changing the core product story.
          </p>
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => (
            <section
              key={plan.name}
              className={
                plan.tone === "highlight"
                  ? "rounded-[28px] border border-cyan-400/25 bg-[linear-gradient(180deg,_rgba(74,190,214,0.12),_rgba(255,255,255,0.04))] p-5 shadow-[0_25px_80px_rgba(27,90,105,0.2)]"
                  : "rounded-[28px] border border-white/10 bg-black/20 p-5"
              }
            >
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/55">{plan.name}</p>
              <p className="mt-4 text-2xl text-white">{plan.pricing}</p>
              <p className="mt-3 text-sm leading-7 text-white/62">{plan.positioning}</p>
              <div className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
                    {feature}
                  </div>
                ))}
              </div>
              <Link
                href="/api"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/78 transition hover:border-white/20 hover:text-white"
              >
                {plan.cta}
              </Link>
            </section>
          ))}
        </div>

        <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Plan comparison</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-sm">
              <thead>
                <tr className="text-left text-white/45">
                  <th className="px-4 py-2 font-normal">Capability</th>
                  {plans.map((plan) => (
                    <th key={plan.name} className="px-4 py-2 font-normal">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="rounded-l-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/78">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${plans[index].name}`}
                        className={`${index === row.values.length - 1 ? "rounded-r-2xl" : ""} border border-white/10 bg-black/20 px-4 py-3 text-white/68`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Commercial assurances</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {procurementSignals.map((signal) => (
              <div key={signal} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/64">
                {signal}
              </div>
            ))}
          </div>
        </section>
      </div>
    </ShellFrame>
  );
}
