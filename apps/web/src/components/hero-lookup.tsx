"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { ArrowRight, Braces, Search } from "lucide-react";

import { searchRegistry } from "@/lib/api";
import type { SearchResult } from "@/types/api";

const suggestionChips = [
  "circle",
  "coinbase",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "app.uniswap.org",
] as const;

export function HeroLookup() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const deferredQuery = useDeferredValue(query);
  const canSearch = deferredQuery.trim().length >= 2;

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    let mounted = true;
    startTransition(() => {
      searchRegistry(deferredQuery, 6)
        .then((payload) => {
          if (mounted) {
            setResults(payload.results);
          }
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
  }, [canSearch, deferredQuery]);

  function openLookup(nextQuery: string, result?: SearchResult) {
    const params = new URLSearchParams({ q: nextQuery });
    if (result) {
      params.set("id", result.id);
      params.set("type", result.node_type);
    }
    router.push(`/lookup?${params.toString()}`);
  }

  return (
    <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.03))] p-5 shadow-[0_40px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/55">Check anything</p>
      <form
        className="mt-4 rounded-[26px] border border-white/10 bg-black/25 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim()) {
            openLookup(query.trim());
          }
        }}
      >
        <label className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Entity, token, domain, contract, wallet, or jurisdiction"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
          >
            Check a project
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            href="/api"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
          >
            <Braces className="h-4 w-4" />
            Get API access
          </Link>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestionChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              setQuery(chip);
              openLookup(chip);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65 transition hover:border-white/20 hover:text-white"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {canSearch && results.length ? (
          results.map((result) => (
            <button
              key={`${result.node_type}:${result.id}`}
              type="button"
              onClick={() => openLookup(query.trim(), result)}
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/5"
            >
              <div>
                <p className="text-sm text-white">{result.label}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/40">
                  {result.node_type.replaceAll("_", " ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/60">
                  {result.source_of_truth ?? "source-backed"}
                </p>
                <p className="mt-1 text-xs text-white/45">{result.matched_on.join(", ") || "match"}</p>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-white/55">
            Search by legal entity, brand, domain, contract address, wallet address, or jurisdiction to start a
            legitimacy check.
          </div>
        )}
      </div>
    </div>
  );
}
