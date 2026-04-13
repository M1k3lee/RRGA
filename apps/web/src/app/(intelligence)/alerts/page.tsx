import { AlertsCenter } from "@/components/alerts-center";
import { ShellFrame } from "@/components/shell-frame";

export default function AlertsPage() {
  return (
    <ShellFrame activePath="/alerts" eyebrow="Watchlists and notifications" title="Alerts Center">
      <AlertsCenter />
    </ShellFrame>
  );
}
