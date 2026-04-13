import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { ContextDock, ContextDockSection, DockMetric } from "@/components/context-dock";
import { EvidenceCard } from "@/components/evidence-card";
import { IntelligenceSummaryCard } from "@/components/intelligence-summary-card";
import { RegulatoryGraph } from "@/components/regulatory-graph";
import { ShellFrame } from "@/components/shell-frame";
import { StatusBadge } from "@/components/status-badge";
import { TrustLegend } from "@/components/trust-legend";
import { getEntity, getEntityGraph } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { getConfidenceLabel, getInvestigationSignals } from "@/lib/intelligence";

export default async function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [entity, graph] = await Promise.all([getEntity(id), getEntityGraph(id)]);
    const signal = getInvestigationSignals(
      {
        id: entity.id,
        node_type: entity.entity_type,
        label: entity.canonical_name,
        score: 1,
        current_status: entity.current_regulatory_status,
        source_of_truth: entity.source_provenance[0] ?? null,
        matched_on: ["source-backed"],
      },
      entity,
      graph,
    );
    const sanctionsCount = entity.linked_sanctions.filter(Boolean).length;
    const warningCount = entity.linked_warnings.filter(Boolean).length;
    const jurisdictions = entity.jurisdictions.map((jurisdiction) => jurisdiction.code).join(", ") || "source unavailable";
    const latestUpdate =
      entity.last_seen_at ??
      entity.historical_status_changes[0]?.first_seen_at ??
      entity.evidence[0]?.artifact_fetched_at ??
      null;

    return (
      <ShellFrame
        activePath="/lookup"
        eyebrow="Entity intelligence dossier"
        title={entity.canonical_name}
        dock={
          <ContextDock
            eyebrow="Dossier context"
            title="Investigation state"
            summary="Keep the most decision-relevant trust and coverage signals visible while reviewing the dossier."
            actions={[
              { label: "Monitor entity", href: `/watchlists?target_type=entity&target_value=${entity.id}`, tone: "warning" },
              { label: "Use in API", href: "/api#endpoint-library", tone: "primary" },
            ]}
          >
            <ContextDockSection title="Coverage markers">
              <div className="grid gap-3">
                <DockMetric
                  label="Live sources"
                  value={
                    entity.source_provenance.length
                      ? `${entity.source_provenance.length} live source${entity.source_provenance.length === 1 ? "" : "s"}`
                      : "source unavailable"
                  }
                />
                <DockMetric label="Evidence bundle" value={`${entity.evidence.length} record${entity.evidence.length === 1 ? "" : "s"}`} tone="positive" />
                <DockMetric label="Latest update" value={formatTimestamp(latestUpdate)} />
              </div>
            </ContextDockSection>
            <ContextDockSection title="Source provenance">
              <div className="flex flex-wrap gap-2">
                {entity.source_provenance.length ? (
                  entity.source_provenance.map((source) => (
                    <span key={source} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70">
                      {source}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-white/55">source unavailable</span>
                )}
              </div>
            </ContextDockSection>
          </ContextDock>
        }
      >
        <div className="space-y-4">
          <IntelligenceSummaryCard
            eyebrow="Entity result summary"
            title={entity.canonical_name}
            entityType={entity.entity_type}
            summaryTitle={signal.title}
            summaryBody={signal.body}
            tone={signal.tone}
            status={entity.current_regulatory_status}
            confidenceLabel={getConfidenceLabel(
              {
                id: entity.id,
                node_type: entity.entity_type,
                label: entity.canonical_name,
                score: 1,
                current_status: entity.current_regulatory_status,
                source_of_truth: entity.source_provenance[0] ?? null,
                matched_on: ["source-backed"],
              },
              entity,
            )}
            latestUpdate={latestUpdate}
            facts={[
              {
                label: "Regulatory status",
                value: entity.current_regulatory_status ?? "source unavailable",
              },
              {
                label: "Sanctions exposure",
                value: sanctionsCount ? `${sanctionsCount} linked record${sanctionsCount === 1 ? "" : "s"}` : "No linked record",
              },
              {
                label: "Warnings",
                value: warningCount ? `${warningCount} signal${warningCount === 1 ? "" : "s"}` : "No warning attached",
              },
              {
                label: "Jurisdictions",
                value: jurisdictions,
              },
              {
                label: "Source coverage",
                value: entity.source_provenance.length
                  ? `${entity.source_provenance.length} live source${entity.source_provenance.length === 1 ? "" : "s"}`
                  : "source unavailable",
              },
            ]}
            body={entity.summary}
            actions={[
              { label: "View evidence", href: "#evidence", icon: "evidence", disabled: !entity.evidence.length },
              { label: "Open full graph", href: "#graph", icon: "graph", disabled: !graph.nodes.length },
              { label: "View timeline", href: "#timeline", icon: "timeline", disabled: !entity.historical_status_changes.length },
              { label: "Monitor entity", href: `/watchlists?target_type=entity&target_value=${entity.id}`, icon: "watch" },
              { label: "Use in API", href: "/api#endpoint-library", icon: "api" },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <section id="graph" className="space-y-4">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                <RegulatoryGraph graph={graph} selectedIds={[graph.nodes[0]?.id ?? ""]} />
              </div>

              <div id="evidence" className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Evidence vault</p>
                <div className="mt-4 space-y-3">
                  {entity.evidence.length ? (
                    entity.evidence.map((item) => (
                      <EvidenceCard
                        key={item.id}
                        sourceName={item.source_name ?? item.source}
                        sourceType={item.source_type}
                        snippet={item.snippet || item.evidence_type}
                        fieldPath={item.field_path}
                        timestamp={item.artifact_published_at ?? item.artifact_fetched_at}
                        uri={item.uri}
                      />
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-white/55">No direct evidence records are attached yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Dossier markers</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Aliases</p>
                    <p className="mt-3 text-sm text-white/75">{entity.aliases.length ? entity.aliases.join(", ") : "source unavailable"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">First seen</p>
                    <p className="mt-3 text-sm text-white/75">{formatTimestamp(entity.first_seen_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Last seen</p>
                    <p className="mt-3 text-sm text-white/75">{formatTimestamp(entity.last_seen_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Evidence records</p>
                    <p className="mt-3 text-sm text-white/75">{entity.evidence.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Regulatory surface</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Register records</p>
                    <p className="mt-3 text-sm text-white/75">{entity.register_records.filter(Boolean).length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Sanctions links</p>
                    <p className="mt-3 text-sm text-white/75">{sanctionsCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Warnings</p>
                    <p className="mt-3 text-sm text-white/75">{warningCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Relationship paths</p>
                    <p className="mt-3 text-sm text-white/75">{graph.edges.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Linked surface area</p>
                <div className="mt-4 space-y-3">
                  {[...entity.linked_domains, ...entity.linked_contracts, ...entity.linked_wallets, ...entity.linked_whitepapers]
                    .slice(0, 12)
                    .map((node) => (
                      <div key={node.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-white">{node.label}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{node.node_type}</p>
                          </div>
                          <StatusBadge value={node.status ?? undefined} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-4">
                <TrustLegend title="Trust and evidence system" />
                <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Confidence notes</p>
                  <div className="mt-4 space-y-3">
                    {entity.confidence_notes.length ? (
                      entity.confidence_notes.slice(0, 6).map((note, index) => (
                        <div key={`${note.edge_type}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-white">{note.edge_type.replaceAll("_", " ")}</p>
                          <p className="mt-1 text-xs text-white/45">Confidence {note.confidence.toFixed(2)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-7 text-white/55">No inferred relationship notes are attached to this entity.</p>
                    )}
                  </div>
                </div>
              </div>

              <div id="timeline" className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Timeline</p>
                <div className="mt-4 space-y-3">
                  {entity.historical_status_changes.length ? (
                    entity.historical_status_changes.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white">{event.summary}</p>
                        <p className="mt-1 text-xs text-white/45">{formatTimestamp(event.first_seen_at)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-white/55">No tracked state changes yet for this entity.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end">
            <Link
              href="/graph"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/78 transition hover:border-white/20 hover:text-white"
            >
              Open advanced graph workspace
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </ShellFrame>
    );
  } catch {
    notFound();
  }
}
