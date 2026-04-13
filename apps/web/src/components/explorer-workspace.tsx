"use client";

import Link from "next/link";
import type { Route } from "next";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ExternalLink, Filter, Search } from "lucide-react";

import { RegulatoryGraph } from "@/components/regulatory-graph";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { GraphResponse, SearchResponse, SearchResult } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const ENTITY_TYPES = new Set(["legal_entity", "brand", "regulator", "sanctions_subject", "individual", "entity"]);
const DIRECT_GRAPH_TYPES = new Set(["contract", "wallet", "domain", "jurisdiction"]);

export function ExplorerWorkspace() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [graph, setGraph] = useState<GraphResponse>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (deferredQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    startTransition(() => {
      fetch(`${API_BASE}/search?q=${encodeURIComponent(deferredQuery)}&limit=12`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then((response) => response.json() as Promise<SearchResponse>)
        .then((payload) => setResults(payload.results))
        .catch(() => setResults([]));
    });
    return () => controller.abort();
  }, [deferredQuery]);

  const nodeTypes = useMemo(() => {
    return [...new Set(graph.nodes.map((node) => node.node_type))];
  }, [graph.nodes]);

  const selectedNodes = useMemo(() => {
    return graph.nodes.filter((node) => selectedIds.includes(node.id));
  }, [graph.nodes, selectedIds]);

  async function loadNeighborhood(result: SearchResult) {
    let graphPath: string | null = null;
    let selectedGraphId: string | null = null;

    if (ENTITY_TYPES.has(result.node_type)) {
      graphPath = `${API_BASE}/entity/${result.id}/graph`;
      selectedGraphId = `entity:${result.id}`;
    } else if (DIRECT_GRAPH_TYPES.has(result.node_type)) {
      graphPath = `${API_BASE}/graph/${result.node_type}/${result.id}`;
      selectedGraphId = `${result.node_type}:${result.id}`;
    } else {
      setGraph({ nodes: [], edges: [] });
      setSelectedIds([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(graphPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load graph");
      }
      const payload = (await response.json()) as GraphResponse;
      setGraph(payload);
      const nextSelectedId =
        (selectedGraphId && payload.nodes.some((node) => node.id === selectedGraphId) && selectedGraphId) ||
        payload.nodes[0]?.id ||
        null;
      setSelectedIds(nextSelectedId ? [nextSelectedId] : []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-[26px] border border-white/10 bg-black/20 p-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
          <label className="flex items-center gap-3">
            <Search className="h-4 w-4 text-white/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search entity, alias, domain, contract, wallet..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </label>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Investigation feed</p>
          <div className="mt-4 space-y-2">
            {results.length ? (
              results.map((result) => (
                <button
                  key={`${result.node_type}:${result.id}`}
                  type="button"
                  onClick={() => void loadNeighborhood(result)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">{result.label}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/40">{result.node_type}</p>
                    </div>
                    <StatusBadge value={result.current_status ?? undefined} />
                  </div>
                  <p className="mt-3 text-xs text-white/45">Matched on {result.matched_on.join(", ") || "name"}.</p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm leading-7 text-white/55">
                Start typing to resolve a real entity or address. The graph only loads when a source-backed match exists.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-[26px] border border-white/10 bg-black/20 px-4 py-3">
          <div className="mr-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
            <Filter className="h-4 w-4" />
            Filters
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
            <span className="text-xs text-white/45">No graph types loaded yet.</span>
          )}
          {loading ? <span className="ml-auto text-xs text-cyan-200/80">Loading neighborhood...</span> : null}
        </div>

        <RegulatoryGraph graph={graph} hiddenTypes={hiddenTypes} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Selection Dock</p>
            <div className="mt-4 space-y-3">
              {selectedNodes.length ? (
                selectedNodes.map((node) => (
                  <div key={node.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white">{node.label}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/45">{node.node_type}</p>
                    <StatusBadge value={node.status ?? undefined} className="mt-3" />
                    {node.id.startsWith("entity:") ? (
                      <Link
                        href={`/entity/${node.id.split(":")[1]}` as Route}
                        className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-cyan-100"
                      >
                        Open dossier
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-white/55">Click a node or use shift-drag to inspect a cluster.</p>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Operational Notes</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/60">
              <p>Use this surface when you need connected investigation context after a legitimacy check.</p>
              <p>Official regulator and sanctions sources win when data conflicts. Enrichment layers never overwrite them.</p>
              <p>Empty graph states are deliberate: the interface only renders evidence-backed objects.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
