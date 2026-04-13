"use client";

import { motion } from "framer-motion";

import type { SourceStatus } from "@/types/api";

const orbitOffsets = [
  { x: -280, y: -90 },
  { x: -130, y: 145 },
  { x: 60, y: -155 },
  { x: 240, y: 80 },
  { x: 20, y: 180 },
];

export function SourceConstellation({ sources }: { sources: SourceStatus[] }) {
  const liveSources = sources.slice(0, 5);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(20,74,94,0.28),_transparent_40%),linear-gradient(180deg,_rgba(6,14,21,0.9),_rgba(2,6,9,0.9))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(3,7,10,0.85)_72%)]" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8" />
      <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />

      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-cyan-400/10 shadow-[0_0_120px_rgba(74,190,214,0.25)]"
      />

      {liveSources.map((source, index) => {
        const offset = orbitOffsets[index] ?? { x: 0, y: 0 };
        return (
          <motion.div
            key={source.slug}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: [1, 1.04, 1], x: [offset.x, offset.x + 6, offset.x], y: [offset.y, offset.y - 6, offset.y] }}
            transition={{ duration: 6 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2"
          >
            <div className="relative">
              <div className="absolute left-1/2 top-1/2 h-px w-48 -translate-y-1/2 origin-left bg-gradient-to-r from-cyan-400/30 to-transparent" />
              <div className="absolute left-[48px] top-1/2 -translate-y-1/2">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/35">{source.source_type}</p>
                <p className="mt-2 max-w-[180px] text-sm text-white/85">{source.name}</p>
              </div>
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/8 shadow-[0_0_35px_rgba(74,190,214,0.18)]">
                <div className="h-3 w-3 rounded-full bg-cyan-200" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
