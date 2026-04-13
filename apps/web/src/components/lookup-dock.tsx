"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import { ContextDock, ContextDockSection, DockMetric } from "@/components/context-dock";
import { getEntity, getEntityGraph, getNodeGraph, searchRegistry } from "@/lib/api";
import { formatCount, formatTimestamp } from "@/lib/format";
import { getInvestigationSignals } from "@/lib/intelligence";
import type { EntityProfile, GraphResponse, SearchResult } from "@/types/api";

const ENTITY_TYPES = new Set(["legal_entity", "brand", "regulator", "sanctions_subject", "individual", "entity"]);

type DockSnapshot = {
  key: string;
  query: string;
  results: SearchResult[];
  selected: SearchResult | null;
  entity: EntityProfile | null;
  graph: GraphResponse | null;
};

export function LookupDock() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const selectedId = searchParams.get("id");
  const selectedType = searchParams.get("type");
  const currentKey = `${query}|${selectedType ?? ""}|${selectedId ?? ""}`;
  const [snapshot, setSnapshot] = useState<DockSnapshot | null>(null);

  useEffect(() => {
    if (!query) {
      return;
    }

    let mounted = true;
    startTransition(() => {
      (async () => {
        const payload = await searchRegistry(query, 12);
        const selected =
          (selectedId && selectedType
            ? payload.results.find((result) => result.id === selectedId && result.node_type === selectedType)
            : null) ?? payload.results[0] ?? null;

        let entity: EntityProfile | null = null;
        let graph: GraphResponse | null = null;

        if (selected) {
          if (ENTITY_TYPES.has(selected.node_type)) {
            [entity, graph] = await Promise.all([getEntity(selected.id), getEntityGraph(selected.id)]);
          } else {
            graph = await getNodeGraph(selected.node_type, selected.id);
          }
        }

        if (mounted) {
          setSnapshot({
            key: currentKey,
            query,
            results: payload.results,
            selected,
            entity,
            graph,
          });
        }
      })().catch(() => {
        if (mounted) {
          setSnapshot({
            key: currentKey,
            query,
            results: [],
            selected: null,
            entity: null,
            graph: null,
          });
        }
      });
    });

    return () => {
      mounted = false;
    };
  }, [currentKey, query, selectedId, selectedType]);

  const current = snapshot?.key === currentKey ? snapshot : null;
  const selected = current?.selected ?? null;
  const entity = current?.entity ?? null;
  const graph = current?.graph ?? null;

  const resultMix = useMemo(() => {
    if (!current?.results.length) {
      return [];
    }

    const counts = new Map<string, number>();
    for (const result of current.results) {
      counts.set(result.node_type, (counts.get(result.node_type) ?? 0) + 1);
    }

    return [...counts.entries()].slice(0, 5);
  }, [current]);

  if (!query) {
    return (
      <ContextDock
        eyebrow="Lookup context"
        title="Decision-ready checks"
        summary="Use Lookup to answer the first commercial question quickly: is this entity regulated, risky, or connected to negative signals?"
        actions={[
          { label: "Explore sources", href: "/sources" },
          { label: "Review API", href: "/api", tone: "primary" },
        ]}
      >
        <ContextDockSection title="What the check returns">
          <div className="grid gap-3">
            <DockMetric label="Regulatory status" value="Official coverage where available" tone="positive" />
            <DockMetric label="Warnings and sanctions" value="Negative signals stay visible" tone="warning" />
            <DockMetric label="Evidence and relationships" value="Traceable fields, timestamps, and links" />
          </div>
        </ContextDockSection>
      </ContextDock>
    );
  }

  if (!current) {
    return (
      <ContextDock eyebrow="Lookup context" title="Loading lookup intelligence" summary="Resolving the current query against live source-backed data.">
        <ContextDockSection title="Current query">
          <p className="text-sm leading-7 text-white/65">{query}</p>
        </ContextDockSection>
      </ContextDock>
    );
  }

  if (!selected) {
    return (
      <ContextDock
        eyebrow="Lookup context"
        title="No current match"
        summary="The current query did not resolve to a source-backed object in the loaded data."
        actions={[{ label: "Inspect sources", href: "/sources" }]}
      >
        <ContextDockSection title="Current query">
          <p className="text-sm leading-7 text-white/65">{query}</p>
        </ContextDockSection>
      </ContextDock>
    );
  }

  const signal = getInvestigationSignals(selected, entity, graph);
  const sanctionsCount =
    entity?.linked_sanctions.filter(Boolean).length ??
    graph?.nodes.filter((node) => node.node_type === "sanctions_entry").length ??
    0;
  const warningCount =
    entity?.linked_warnings.filter(Boolean).length ??
    graph?.nodes.filter((node) => node.node_type === "warning_notice").length ??
    0;
  const sourceCoverage = entity?.source_provenance.length
    ? formatCount(entity.source_provenance.length, "live source")
    : typeof selected.source_of_truth === "string"
      ? selected.source_of_truth
      : "source unavailable";
  const latestUpdate =
    entity?.last_seen_at ?? entity?.historical_status_changes[0]?.first_seen_at ?? entity?.evidence[0]?.artifact_fetched_at ?? null;

  return (
    <ContextDock
      eyebrow="Lookup context"
      title={entity?.canonical_name ?? selected.label}
      summary={signal.body}
      actions={[
        entity ? { label: "Open dossier", href: `/entity/${entity.id}`, tone: "primary" } : { label: "Open graph", href: "#lookup-graph", tone: "primary" },
        { label: "Monitor", href: `/watchlists?target_type=${encodeURIComponent(selected.node_type)}&target_value=${encodeURIComponent(selected.id)}`, tone: "warning" },
        { label: "Use in API", href: "/api#endpoint-library" },
      ]}
    >
      <ContextDockSection title="Current posture">
        <div className="grid gap-3">
          <DockMetric label="Decision signal" value={signal.title} tone={signal.tone === "critical" ? "warning" : signal.tone === "clear" ? "positive" : "neutral"} />
          <DockMetric label="Source coverage" value={sourceCoverage} />
          <DockMetric label="Latest update" value={formatTimestamp(latestUpdate)} />
        </div>
      </ContextDockSection>

      <ContextDockSection title="What surfaced">
        <div className="grid gap-3">
          <DockMetric label="Warnings" value={warningCount ? formatCount(warningCount, "signal") : "No warning attached"} tone={warningCount ? "warning" : "neutral"} />
          <DockMetric label="Sanctions exposure" value={sanctionsCount ? formatCount(sanctionsCount, "linked record") : "No linked record"} tone={sanctionsCount ? "warning" : "positive"} />
          <DockMetric
            label="Relationships"
            value={graph ? formatCount(graph.edges.length, "connected path", "No linked paths") : "source unavailable"}
          />
        </div>
      </ContextDockSection>

      <ContextDockSection title="Current result set">
        <div className="space-y-3">
          <p className="text-sm leading-7 text-white/65">
            {formatCount(current.results.length, "candidate")} returned for <span className="text-white">{current.query}</span>.
          </p>
          {resultMix.length ? (
            <div className="flex flex-wrap gap-2">
              {resultMix.map(([type, count]) => (
                <span key={type} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/70">
                  {count} {type.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </ContextDockSection>
    </ContextDock>
  );
}
