"use client";

import { useState } from "react";

import { createWatchlist, getAlerts, getWatchlists } from "@/lib/api";
import type { AlertEvent, Watchlist } from "@/types/api";

export function AlertsCenter() {
  const [apiKey, setApiKey] = useState("");
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [label, setLabel] = useState("");
  const [targetType, setTargetType] = useState("entity");
  const [targetValue, setTargetValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function loadInbox() {
    if (!apiKey) return;
    try {
      const [watchlistItems, alertItems] = await Promise.all([getWatchlists(apiKey), getAlerts(apiKey)]);
      setWatchlists(watchlistItems);
      setAlerts(alertItems);
      setStatus("Loaded authenticated alert state.");
    } catch {
      setStatus("Unable to load alerts with that API key.");
    }
  }

  async function createRule() {
    if (!apiKey || !targetValue) return;
    try {
      await createWatchlist(apiKey, {
        label,
        target_type: targetType,
        target_value: targetValue,
        rule_type: "status_change",
        delivery_channel: "inbox",
      });
      setStatus("Watchlist created.");
      await loadInbox();
    } catch {
      setStatus("Unable to create watchlist.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-[26px] border border-white/10 bg-black/20 p-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Authenticated Access</p>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Paste x-api-key to manage watchlists"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
          />
          <button
            type="button"
            onClick={() => void loadInbox()}
            className="mt-3 w-full rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
          >
            Load Alert State
          </button>
          {status ? <p className="mt-3 text-sm text-white/55">{status}</p> : null}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Create Watchlist</p>
          <div className="mt-4 space-y-3">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Optional label"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <select
              value={targetType}
              onChange={(event) => setTargetType(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="entity">Entity</option>
              <option value="domain">Domain</option>
              <option value="contract">Contract</option>
              <option value="wallet">Wallet</option>
              <option value="jurisdiction">Jurisdiction</option>
            </select>
            <input
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              placeholder="Entity id, hostname, address, or jurisdiction code"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
            <button
              type="button"
              onClick={() => void createRule()}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
            >
              Create Watchlist Rule
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Watchlists</p>
          <div className="mt-4 space-y-3">
            {watchlists.length ? (
              watchlists.map((watchlist) => (
                <div key={watchlist.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white">{watchlist.label || "Untitled watchlist"}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                    {watchlist.target_type}: {watchlist.target_value}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-white/55">
                No authenticated watchlists loaded yet. This module stays blank until a real user key is supplied.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Alert Inbox</p>
          <div className="mt-4 space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white">{alert.title}</p>
                  <p className="mt-1 text-xs text-white/45">{new Date(alert.created_at).toLocaleString()}</p>
                  <pre className="mt-3 overflow-x-auto rounded-2xl bg-black/30 p-3 text-xs text-cyan-100/80">
                    {JSON.stringify(alert.payload, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-white/55">
                The inbox only shows stored alert events. Use the backend `/alerts/test` endpoint or live watchlist-triggered events to populate it.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
