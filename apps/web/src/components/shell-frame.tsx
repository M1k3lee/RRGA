import Link from "next/link";
import { Orbit, Radar, ScrollText, Siren, TowerControl } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/explorer", label: "Explorer", icon: Orbit },
  { href: "/sources", label: "Source Monitor", icon: TowerControl },
  { href: "/alerts", label: "Alerts", icon: Siren },
  { href: "/docs", label: "API Docs", icon: ScrollText },
] as const;

export function ShellFrame({
  activePath,
  title,
  eyebrow,
  children,
  dock,
}: {
  activePath: string;
  title: string;
  eyebrow: string;
  children: ReactNode;
  dock?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(21,52,67,0.32),_transparent_30%),linear-gradient(180deg,_#07131d,_#04080c_40%,_#03070a)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Radar className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">{eyebrow}</p>
                <h1 className="font-sans text-2xl font-semibold text-white">{title}</h1>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = activePath === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                      active
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[1.2fr_360px]">
          <main className="rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            {children}
          </main>
          <aside className="hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
            {dock ?? (
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Context Dock</p>
                <p className="text-sm leading-7 text-white/65">
                  Search an entity, domain, contract, or wallet to open its regulatory neighborhood. The graph stays
                  empty until real evidence is available.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
