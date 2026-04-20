import { ShellFrame } from "@/components/shell-frame";

export default function Loading() {
  return (
    <ShellFrame
      activePath="/sources"
      eyebrow="Connecting to decentralized nodes"
      title="Sources"
      dock={
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-white/5" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-[26px] border border-white/5 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-2 w-16 rounded bg-white/10" />
                <div className="h-6 w-48 rounded bg-white/10" />
                <div className="h-2 w-24 rounded bg-white/10" />
              </div>
              <div className="h-6 w-20 rounded-full bg-white/10" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="h-2 w-12 rounded bg-white/10" />
                  <div className="mt-3 h-8 w-8 rounded bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm text-white/45">
          Connecting to API... This may take up to 30 seconds if the service is waking up.
        </p>
      </div>
    </ShellFrame>
  );
}
