import { notFound } from "next/navigation";

import { RegulatoryGraph } from "@/components/regulatory-graph";
import { ShellFrame } from "@/components/shell-frame";
import { StatusBadge } from "@/components/status-badge";
import { getEntity, getEntityGraph } from "@/lib/api";

export default async function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const [entity, graph] = await Promise.all([getEntity(id), getEntityGraph(id)]);
    return (
      <ShellFrame
        activePath="/explorer"
        eyebrow="Dossier view"
        title={entity.canonical_name}
        dock={
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Source Provenance</p>
            <div className="flex flex-wrap gap-2">
              {entity.source_provenance.length ? (
                entity.source_provenance.map((source) => (
                  <span key={source} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                    {source}
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/55">source unavailable</span>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{entity.entity_type}</p>
                <h2 className="mt-3 text-3xl text-white">{entity.canonical_name}</h2>
                {entity.aliases.length ? (
                  <p className="mt-3 text-sm leading-7 text-white/60">Aliases: {entity.aliases.join(", ")}</p>
                ) : null}
              </div>
              <StatusBadge value={entity.current_regulatory_status ?? undefined} />
            </div>
            {entity.summary ? <p className="mt-6 max-w-4xl text-sm leading-8 text-white/65">{entity.summary}</p> : null}
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-4">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                <RegulatoryGraph graph={graph} selectedIds={[graph.nodes[0]?.id ?? ""]} />
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Evidence Vault</p>
                <div className="mt-4 space-y-3">
                  {entity.evidence.length ? (
                    entity.evidence.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/55">{item.source}</p>
                        <p className="mt-2 text-sm text-white/80">{item.snippet || item.evidence_type}</p>
                        {item.uri ? (
                          <a href={item.uri} target="_blank" className="mt-3 inline-block text-sm text-cyan-200">
                            Open source artifact
                          </a>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-white/55">No evidence records are attached yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Jurisdictions</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {entity.jurisdictions.length ? (
                    entity.jurisdictions.map((jurisdiction) => (
                      <div key={`${jurisdiction.code}-${jurisdiction.role}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                        {jurisdiction.code} / {jurisdiction.role}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-white/55">source unavailable</span>
                  )}
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Linked Surface Area</p>
                <div className="mt-4 space-y-3">
                  {[...entity.linked_domains, ...entity.linked_contracts, ...entity.linked_wallets, ...entity.linked_whitepapers]
                    .slice(0, 12)
                    .map((node) => (
                      <div key={node.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white">{node.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">{node.node_type}</p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Timeline</p>
                <div className="mt-4 space-y-3">
                  {entity.historical_status_changes.length ? (
                    entity.historical_status_changes.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white">{event.summary}</p>
                        <p className="mt-1 text-xs text-white/45">{new Date(event.first_seen_at).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-white/55">No tracked state changes yet for this entity.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </ShellFrame>
    );
  } catch {
    notFound();
  }
}
