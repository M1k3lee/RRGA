import { ExplorerWorkspace } from "@/components/explorer-workspace";
import { ShellFrame } from "@/components/shell-frame";

export default function GraphPage() {
  return (
    <ShellFrame
      activePath="/graph"
      eyebrow="Connected evidence and relationship investigation"
      title="Graph"
      dock={
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Investigation mode</p>
          <div className="space-y-3 text-sm leading-7 text-white/60">
            <p>Use Graph after the legitimacy summary, not instead of it.</p>
            <p>Follow linked contracts, domains, warnings, sanctions entries, and jurisdictions without losing source context.</p>
            <p>Confidence only appears when the system is connecting evidence-backed records through matching logic.</p>
          </div>
        </div>
      }
    >
      <ExplorerWorkspace />
    </ShellFrame>
  );
}
