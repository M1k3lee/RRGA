"use client";

import dynamic from "next/dynamic";

import type { SourceStatus } from "@/types/api";

const SourceConstellation = dynamic(
  () => import("@/components/source-constellation").then((module) => module.SourceConstellation),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-[420px] overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(20,74,94,0.18),_transparent_40%),linear-gradient(180deg,_rgba(6,14,21,0.9),_rgba(2,6,9,0.9))]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(3,7,10,0.85)_72%)]" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />
      </div>
    ),
  },
);

export function SourceConstellationShell({ sources }: { sources: SourceStatus[] }) {
  return <SourceConstellation sources={sources} />;
}
