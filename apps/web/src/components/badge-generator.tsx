"use client";

import { useState } from "react";
import { Copy, Check, Code2 } from "lucide-react";
import { TrustBadge, type BadgeTone } from "./trust-badge";
import { cn } from "@/lib/utils";

export function BadgeGenerator({ 
  name, 
  id, 
  type, 
  currentStatus, 
  currentTone 
}: { 
  name: string; 
  id: string; 
  type: string;
  currentStatus: string;
  currentTone: BadgeTone;
}) {
  const [copied, setCopied] = useState(false);
  
  const publicUrl = typeof window !== "undefined" ? window.location.origin : "https://voto-web.onrender.com";
  const embedCode = `<div id="voto-badge" data-id="${id}" data-type="${type}"></div>
<script src="${publicUrl}/embed/badge.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-3xl border border-white/10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 mb-6 text-center">Preview Status Badge</p>
        <TrustBadge 
          name={name} 
          status={currentStatus} 
          tone={currentTone} 
          lastUpdated="Today"
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-medium text-white/60">
          <Code2 className="h-4 w-4" />
          Embed Snippet
        </label>
        <div className="relative group">
          <pre className="p-4 bg-black/60 rounded-2xl border border-white/10 text-[11px] text-cyan-100/70 overflow-x-auto font-mono leading-relaxed">
            {embedCode}
          </pre>
          <button
            onClick={copyToClipboard}
            className="absolute top-3 right-3 p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[10px] text-white/35">
          Paste this snippet into your project's website to display your real-time VOTO verified status.
        </p>
      </div>
    </div>
  );
}
