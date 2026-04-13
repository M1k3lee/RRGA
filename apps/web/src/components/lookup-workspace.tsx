"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Filter, Search } from "lucide-react";

import { EvidenceCard } from "@/components/evidence-card";
import { IntelligenceSummaryCard } from "@/components/intelligence-summary-card";
import { RegulatoryGraph } from "@/components/regulatory-graph";
import { StatusBadge } from "@/components/status-badge";
import { TrustLegend } from "@/components/trust-legend";
import {
  getContract,
  getDomain,
  getEntity,
  getEntityGraph,
  getJurisdiction,
  getNodeGraph,
  getWallet,
  searchRegistry,
} from "@/lib/api";
import { formatCount, formatTimestamp } from "@/lib/format";
import { getConfidenceLabel, getInvestigationSignals } from "@/lib/intelligence";
import { cn } from "@/lib/utils";
import type {
  ContractProfile,
  DomainProfile,
  EntityProfile,
  GraphResponse,
  JurisdictionProfile,
  SearchResult,
  WalletProfile,
} from "@/types/api";

const ENTITY_TYPES = new Set(["legal_entity", "brand", "regulator", "sanctions_subject", "individual", "entity"]);
const DIRECT_GRAPH_TYPES = new Set(["contract", "wallet", "domain", "jurisdiction"]);

type LookupDetail =
  | { kind: "entity"; data: EntityProfile }
  | { kind: "contract"; data: ContractProfile }
  | { kind: "domain"; data: DomainProfile }
  | { kind: "wallet"; data: WalletProfile }
  | { kind: "jurisdiction"; data: JurisdictionProfile }
  | null;

function resultNodeId(result: SearchResult) {
  return ENTITY_TYPES.has(result.node_type) ? `entity:${result.id}` : `${result.node_type}:${result.id}`;
}

function truncate(value: string, start = 10, end = 8) {
  if (value.length <= start + end + 3) {
    return value;
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function LookupWorkspace({
  initialQuery = "",
  initialSelection,
}: {
  initialQuery?: string;
  initialSelection?: { id?: string; nodeType?: string } | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [detail, setDetail] = useState<LookupDetail>(null);
  const [graph, setGraph] = useState<GraphResponse>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);
  const pendingSelectionRef = useRef(initialSelection);
  const autoSelectedKeyRef = useRef<string | null>(null);

  const loadResult = useCallback(async (result: SearchResult) => {
    let nextGraph: GraphResponse = { nodes: [], edges: [] };
    let nextDetail: LookupDetail = null;
    const preferredNodeId = resultNodeId(result);

    setSelectedResult(result);
    setLoading(true);
    const params = new URLSearchParams({ q: query.trim() || result.label, id: result.id, type: result.node_type });
    router.replace(`/lookup?${params.toString()}`);

    try {
      if (ENTITY_TYPES.has(result.node_type)) {
        const [entityGraph, entityDetail] = await Promise.all([getEntityGraph(result.id), getEntity(result.id)]);
        nextGraph = entityGraph;
        nextDetail = { kind: "entity", data: entityDetail };
      } else if (DIRECT_GRAPH_TYPES.has(result.node_type)) {
        nextGraph = await getNodeGraph(result.node_type, result.id);
        if (result.node_type === "contract") {
          const contractNode = nextGraph.nodes.find((node) => node.id === preferredNodeId);
          const chain = typeof contractNode?.meta.chain === "string" ? contractNode.meta.chain : null;
          const address = typeof contractNode?.meta.address === "string" ? contractNode.meta.address : null;
          if (chain && address) {
            const contractDetail = await getContract(chain, address);
            if (!("detail" in contractDetail)) {
              nextDetail = { kind: "contract", data: contractDetail };
            }
          }
        } else if (result.node_type === "domain") {
          const domainDetail = await getDomain(result.label);
          if (!("detail" in domainDetail)) {
            nextDetail = { kind: "domain", data: domainDetail };
          }
        } else if (result.node_type === "jurisdiction") {
          const jurisdictionDetail = await getJurisdiction(result.id);
          if (!("detail" in jurisdictionDetail)) {
            nextDetail = { kind: "jurisdiction", data: jurisdictionDetail };
          }
        } else if (result.node_type === "wallet") {
          const walletNode = nextGraph.nodes.find((node) => node.id === preferredNodeId);
          const chain = typeof walletNode?.meta.chain === "string" ? walletNode.meta.chain : null;
          const address = typeof walletNode?.meta.address === "string" ? walletNode.meta.address : null;
          if (chain && address) {
            const walletDetail = await getWallet(chain, address);
            if (!("detail" in walletDetail)) {
              nextDetail = { kind: "wallet", data: walletDetail };
            }
          }
        }
      }

      setGraph(nextGraph);
      setDetail(nextDetail);
      setSelectedIds(
        nextGraph.nodes.some((node) => node.id === preferredNodeId)
          ? [preferredNodeId]
          : nextGraph.nodes[0]
            ? [nextGraph.nodes[0].id]
            : [],
      );
    } catch {
      setGraph({ nodes: [], edges: [] });
      setDetail(null);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [query, router]);

  useEffect(() => {
    if (deferredQuery.trim().length < 2) {
      setResults([]);
      if (!deferredQuery.trim()) {
        setSelectedResult(null);
        setDetail(null);
        setGraph({ nodes: [], edges: [] });
        setSelectedIds([]);
      }
      return;
    }

    let mounted = true;
    startTransition(() => {
      searchRegistry(deferredQuery, 12)
        .then((payload) => {
          if (!mounted) {
            return;
          }
          setResults(payload.results);
        })
        .catch(() => {
          if (mounted) {
            setResults([]);
          }
        });
    });

    return () => {
      mounted = false;
    };
  }, [deferredQuery]);

  useEffect(() => {
    if (!results.length) {
      return;
    }

    const preferred = pendingSelectionRef.current?.id
      ? results.find(
          (result) =>
            result.id === pendingSelectionRef.current?.id &&
            result.node_type === pendingSelectionRef.current?.nodeType,
        ) ?? results[0]
      : results[0];

    if (!preferred) {
      return;
    }

    const selectionKey = `${preferred.node_type}:${preferred.id}`;
    if (autoSelectedKeyRef.current === selectionKey) {
      return;
    }

    autoSelectedKeyRef.current = selectionKey;
    pendingSelectionRef.current = null;
    void loadResult(preferred);
  }, [results, loadResult]);

  const nodeTypes = useMemo(() => [...new Set(graph.nodes.map((node) => node.node_type))], [graph.nodes]);
  const baseNode = useMemo(() => {
    if (!selectedResult) {
      return null;
    }
    const preferredId = resultNodeId(selectedResult);
    return graph.nodes.find((node) => node.id === preferredId) ?? graph.nodes[0] ?? null;
  }, [graph.nodes, selectedResult]);

  const entityDetail = detail?.kind === "entity" ? detail.data : null;
  const evidenceItems = useMemo(() => entityDetail?.evidence.slice(0, 6) ?? [], [entityDetail]);
  const timelineItems = useMemo(() => entityDetail?.historical_status_changes.slice(0, 6) ?? [], [entityDetail]);
  const connectedNodes = graph.nodes.filter((node) => node.id !== baseNode?.id).slice(0, 10);
  const resultMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const result of results) {
      counts.set(result.node_type, (counts.get(result.node_type) ?? 0) + 1);
    }
    return [...counts.entries()].slice(0, 6);
  }, [results]);

  const summary = useMemo(() => {
    if (!selectedResult) {
      return null;
    }

    const signal = getInvestigationSignals(selectedResult, entityDetail, graph);
    const sanctionsCount =
      entityDetail?.linked_sanctions.filter(Boolean).length ??
      graph.nodes.filter((node) => node.node_type === "sanctions_entry").length;
    const warningCount =
      entityDetail?.linked_warnings.filter(Boolean).length ??
      graph.nodes.filter((node) => node.node_type === "warning_notice").length;
    const jurisdictionsValue = entityDetail?.jurisdictions.length
      ? entityDetail.jurisdictions.map((jurisdiction) => jurisdiction.code).slice(0, 3).join(", ")
      : detail?.kind === "jurisdiction"
        ? detail.data.code
        : "source unavailable";

    const facts = [
      {
        label: "Regulatory status",
        value: entityDetail?.current_regulatory_status ?? selectedResult.current_status ?? "source unavailable",
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
        value: jurisdictionsValue,
      },
      {
        label: "Source coverage",
        value: entityDetail?.source_provenance.length
          ? `${entityDetail.source_provenance.length} live source${entityDetail.source_provenance.length === 1 ? "" : "s"}`
          : detail?.kind === "contract"
            ? typeof detail.data.meta.source === "string"
              ? detail.data.meta.source
              : "source unavailable"
            : "source unavailable",
      },
    ];

    if (detail?.kind === "contract") {
      facts[0] = { label: "Chain", value: detail.data.chain };
      facts[1] = { label: "Contract", value: truncate(detail.data.address) };
      facts[2] = { label: "Linked entities", value: `${detail.data.related_nodes.length}` };
      facts[3] = { label: "Verification", value: detail.data.is_verified ? "Verified contract" : "Observed contract" };
      facts[4] = {
        label: "Source coverage",
        value: typeof detail.data.meta.source === "string" ? detail.data.meta.source : "source unavailable",
      };
    }

    if (detail?.kind === "domain") {
      facts[0] = { label: "Hostname", value: detail.data.hostname };
      facts[1] = { label: "Canonical URL", value: detail.data.canonical_url ?? "source unavailable" };
      facts[2] = { label: "Linked entities", value: `${detail.data.linked_entities.length}` };
      facts[3] = { label: "Warnings", value: warningCount ? `${warningCount}` : "No warning attached" };
      facts[4] = { label: "Source coverage", value: "Source-backed domain evidence" };
    }

    if (detail?.kind === "wallet") {
      facts[0] = { label: "Chain", value: detail.data.chain };
      facts[1] = { label: "Wallet", value: truncate(detail.data.address) };
      facts[2] = { label: "Linked entities", value: `${detail.data.related_nodes.length}` };
      facts[3] = { label: "Warnings", value: warningCount ? `${warningCount}` : "No warning attached" };
      facts[4] = { label: "Source coverage", value: "Observed wallet relationship" };
    }

    if (detail?.kind === "jurisdiction") {
      facts[0] = { label: "Jurisdiction", value: detail.data.code };
      facts[1] = { label: "Entities", value: `${detail.data.entities.length}` };
      facts[2] = { label: "Warnings", value: warningCount ? `${warningCount}` : "No warning attached" };
      facts[3] = { label: "Sanctions exposure", value: sanctionsCount ? `${sanctionsCount}` : "No linked record" };
      facts[4] = { label: "Coverage", value: "Jurisdiction-linked intelligence" };
    }

    const latestUpdate =
      entityDetail?.last_seen_at ??
      entityDetail?.historical_status_changes[0]?.first_seen_at ??
      entityDetail?.evidence[0]?.artifact_fetched_at ??
      null;

    return {
      eyebrow: "Lookup result",
      title: entityDetail?.canonical_name ?? selectedResult.label,
      entityType: entityDetail?.entity_type ?? selectedResult.node_type,
      summaryTitle: signal.title,
      summaryBody: signal.body,
      tone: signal.tone,
      status: entityDetail?.current_regulatory_status ?? selectedResult.current_status,
      confidenceLabel: getConfidenceLabel(selectedResult, entityDetail),
      latestUpdate,
      facts,
      body:
        entityDetail?.summary ??
        (detail?.kind === "contract" ? "This contract was materialized from real source-backed token metadata." : null),
    };
  }, [detail, entityDetail, graph, selectedResult]);

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-[26px] border border-white/10 bg-black/20 p-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
          <label className="flex items-center gap-3">
            <Search className="h-4 w-4 text-white/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Check entity, token, domain, contract, wallet, or jurisdiction"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </label>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Lookup results</p>
          <div className="mt-4 space-y-2">
            {results.length ? (
              results.map((result) => {
                const active = selectedResult?.id === result.id && selectedResult.node_type === result.node_type;
                return (
                  <button
                    key={`${result.node_type}:${result.id}`}
                    type="button"
                    onClick={() => void loadResult(result)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      active
                        ? "border-cyan-400/25 bg-cyan-400/7"
                        : "border-white/10 bg-black/20 hover:border-cyan-400/20 hover:bg-cyan-400/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-white">{result.label}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/40">
                          {result.node_type.replaceAll("_", " ")}
                        </p>
                      </div>
                      <StatusBadge value={result.current_status ?? undefined} />
                    </div>
                    <p className="mt-3 text-xs text-white/45">
                      Matched on {result.matched_on.join(", ") || "source-backed name"}.
                    </p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm leading-7 text-white/55">
                Run a search to see source-backed matches. Address queries only return contracts or wallets now, never
                fuzzy name matches.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Search coverage</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Returned candidates</p>
              <p className="mt-2 text-sm text-white">
                {results.length ? formatCount(results.length, "candidate") : "No source-backed candidate yet"}
              </p>
            </div>
            {resultMix.length ? (
              <div className="flex flex-wrap gap-2">
                {resultMix.map(([type, count]) => (
                  <span key={type} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70">
                    {count} {type.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-white/55">
                Query by legal entity, token, issuer, domain, contract, wallet, or jurisdiction to resolve a live result.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {summary ? (
          <IntelligenceSummaryCard
            eyebrow={summary.eyebrow}
            title={summary.title}
            entityType={summary.entityType}
            summaryTitle={summary.summaryTitle}
            summaryBody={summary.summaryBody}
            tone={summary.tone}
            status={summary.status}
            confidenceLabel={summary.confidenceLabel}
            latestUpdate={summary.latestUpdate}
            facts={summary.facts}
            body={summary.body}
            actions={[
              { label: "View evidence", href: "#lookup-evidence", icon: "evidence", disabled: !evidenceItems.length },
              { label: "Open full graph", href: "#lookup-graph", icon: "graph", disabled: !graph.nodes.length },
              { label: "View timeline", href: "#lookup-timeline", icon: "timeline", disabled: !timelineItems.length },
              {
                label: "Monitor entity",
                href: `/watchlists?target_type=${encodeURIComponent(selectedResult?.node_type ?? "entity")}&target_value=${encodeURIComponent(selectedResult?.id ?? "")}`,
                icon: "watch",
              },
              { label: "Use in API", href: "/api#endpoint-library", icon: "api" },
            ]}
          />
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Legitimacy summary</p>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/60">
              Use Lookup to run a fast regulatory and risk check against real source-backed records. The summary layer
              surfaces register coverage, sanctions exposure, warning signals, evidence, and relationship context.
            </p>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-[26px] border border-white/10 bg-black/20 px-4 py-3">
          <div className="mr-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
            <Filter className="h-4 w-4" />
            Graph filters
          </div>
          {nodeTypes.length ? (
            nodeTypes.map((type) => {
              const active = !hiddenTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setHiddenTypes((current) =>
                      active ? [...current, type] : current.filter((item) => item !== type),
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition",
                    active
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-white/40",
                  )}
                >
                  {type.replaceAll("_", " ")}
                </button>
              );
            })
          ) : (
            <span className="text-xs text-white/45">No evidence-backed graph loaded yet.</span>
          )}
          {loading ? <span className="ml-auto text-xs text-cyan-200/80">Loading intelligence...</span> : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div id="lookup-graph" className="rounded-[26px] border border-white/10 bg-black/20 p-4">
            <RegulatoryGraph
              graph={graph}
              hiddenTypes={hiddenTypes}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>

          <div className="space-y-4">
            <section id="lookup-evidence" className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Evidence vault</p>
              <div className="mt-4 space-y-3">
                {evidenceItems.length ? (
                  evidenceItems.map((item) => (
                    <EvidenceCard
                      key={item.id}
                      sourceName={item.source_name ?? item.source}
                      sourceType={item.source_type}
                      snippet={item.snippet ?? item.evidence_type}
                      fieldPath={item.field_path}
                      timestamp={item.artifact_published_at ?? item.artifact_fetched_at}
                      uri={item.uri}
                    />
                  ))
                ) : (
                  <p className="text-sm leading-7 text-white/55">
                    No direct evidence bundle is attached to this result yet. Use the graph and source pages to inspect
                    available coverage.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Connected relationships</p>
              <div className="mt-4 space-y-3">
                {connectedNodes.length ? (
                  connectedNodes.map((node) => (
                    <div key={node.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{node.label}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/45">{node.node_type}</p>
                        </div>
                        <StatusBadge value={node.status ?? undefined} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-white/55">No connected relationships loaded yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section id="lookup-timeline" className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Timeline</p>
            <div className="mt-4 space-y-3">
              {timelineItems.length ? (
                timelineItems.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white">{event.summary}</p>
                    <p className="mt-1 text-xs text-white/45">{formatTimestamp(event.first_seen_at)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-white/55">
                  No timeline changes are attached to this result yet. Timeline coverage only appears when the system
                  has source-backed snapshots to compare.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <TrustLegend title="Trust and evidence system" />
            {entityDetail ? (
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Confidence notes</p>
                <div className="mt-4 space-y-3">
                  {entityDetail.confidence_notes.length ? (
                    entityDetail.confidence_notes.slice(0, 4).map((note, index) => (
                      <div key={`${note.edge_type}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white">{note.edge_type.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-xs text-white/45">Confidence {note.confidence.toFixed(2)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-white/55">No inferred relationship notes are attached to this result.</p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        {entityDetail ? (
          <div className="flex justify-end">
            <Link
              href={`/entity/${entityDetail.id}` as Route}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:text-white"
            >
              Open full dossier
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
