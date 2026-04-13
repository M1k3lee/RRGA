import { ExplorerWorkspace } from "@/components/explorer-workspace";
import { ShellFrame } from "@/components/shell-frame";

export default function ExplorerPage() {
  return (
    <ShellFrame
      activePath="/explorer"
      eyebrow="Graph-first regulatory intelligence"
      title="Explorer"
      dock={
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Mode Guide</p>
          <div className="space-y-3 text-sm leading-7 text-white/60">
            <p>Search resolves real entities, domains, contracts, wallets, and jurisdictions from ingested evidence.</p>
            <p>Official-source facts remain distinct from inferred links. Confidence only appears where matching logic is involved.</p>
            <p>Use lasso selection to isolate a cluster, then open a dossier for full provenance.</p>
          </div>
        </div>
      }
    >
      <ExplorerWorkspace />
    </ShellFrame>
  );
}
