import { AlertsCenter } from "@/components/alerts-center";
import { ShellFrame } from "@/components/shell-frame";

export default function WatchlistsPage() {
  return (
    <ShellFrame
      activePath="/watchlists"
      eyebrow="Monitoring and alert delivery"
      title="Watchlists"
      dock={
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Monitor changes</p>
          <div className="space-y-3 text-sm leading-7 text-white/60">
            <p>Store high-priority entities, domains, contracts, wallets, and jurisdictions for recurring checks.</p>
            <p>Alerts are built for new warnings, sanctions updates, register changes, and evidence shifts.</p>
            <p>This is the workflow layer for teams that need legitimacy monitoring in production.</p>
          </div>
        </div>
      }
    >
      <AlertsCenter />
    </ShellFrame>
  );
}
