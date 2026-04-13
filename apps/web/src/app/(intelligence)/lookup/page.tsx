import { LookupDock } from "@/components/lookup-dock";
import { LookupWorkspace } from "@/components/lookup-workspace";
import { ShellFrame } from "@/components/shell-frame";

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string; type?: string }>;
}) {
  const params = await searchParams;

  return (
    <ShellFrame
      activePath="/lookup"
      eyebrow="Real-time legitimacy and regulatory checks for crypto entities"
      title="Lookup"
      dock={<LookupDock />}
    >
      <LookupWorkspace
        initialQuery={params.q ?? ""}
        initialSelection={params.id && params.type ? { id: params.id, nodeType: params.type } : null}
      />
    </ShellFrame>
  );
}
