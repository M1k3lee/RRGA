import { ShellFrame } from "@/components/shell-frame";
import { getOpenApiDocument, getSources } from "@/lib/api";

export default async function DocsPage() {
  const [openApi, sources] = await Promise.all([getOpenApiDocument(), getSources()]);
  const paths = Object.keys((openApi.paths as Record<string, unknown> | undefined) ?? {});
  const liveSample = sources[0] ?? null;

  return (
    <ShellFrame activePath="/docs" eyebrow="REST surface" title="API Docs">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Exposed routes</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {paths.length ? (
              paths.map((path) => (
                <div key={path} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  {path}
                </div>
              ))
            ) : (
              <p className="text-sm text-white/55">OpenAPI document unavailable.</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Live sample response</p>
            {liveSample ? (
              <pre className="mt-4 overflow-x-auto rounded-[22px] bg-black/35 p-4 text-xs text-cyan-100/80">
                {JSON.stringify(liveSample, null, 2)}
              </pre>
            ) : (
              <p className="mt-4 text-sm leading-7 text-white/55">Sample unavailable until a real source response is reachable.</p>
            )}
          </div>
          <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Docs policy</p>
            <p className="mt-4 text-sm leading-7 text-white/60">
              Samples on this page come from live responses only. If the backend has no ingested data yet, the module stays empty rather than fabricating example records.
            </p>
          </div>
        </section>
      </div>
    </ShellFrame>
  );
}
