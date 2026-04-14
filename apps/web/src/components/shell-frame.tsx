import Link from "next/link";
import {
  Braces,
  House,
  LogIn,
  Orbit,
  ScrollText,
  Search,
  Siren,
  TowerControl,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import Image from "next/image";

import { ContextDock, ContextDockSection, DockMetric } from "@/components/context-dock";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/lookup", label: "Lookup", icon: Search },
  { href: "/graph", label: "Graph", icon: Orbit },
  { href: "/watchlists", label: "Watchlists", icon: Siren },
  { href: "/sources", label: "Sources", icon: TowerControl },
  { href: "/api", label: "API", icon: Braces },
  { href: "/docs", label: "Docs", icon: ScrollText },
  { href: "/pricing", label: "Pricing", icon: WalletCards },
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
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative h-[87px] w-auto overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-lg transition-transform group-hover:scale-105">
                  <Image
                    src="/voto-logo.png"
                    alt="VOTO logo"
                    height={87}
                    width={87}
                    className="h-[87px] w-auto object-contain"
                    priority
                  />
                </div>
              </Link>
              <div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.34em] text-white/45">{eyebrow}</p>
                <h1 className="font-sans text-2xl font-semibold text-white">{title}</h1>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
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
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[1.2fr_360px]">
          <main className="rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            {children}
          </main>
          <aside className="hidden lg:block">
            <div className="sticky top-4 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              {dock ?? (
                <ContextDock
                  eyebrow="Context dock"
                  title="Source-backed intelligence"
                  summary="Use the side rail for live trust context, decision support, and actions that move investigations into workflows."
                >
                  <ContextDockSection title="Trust model">
                    <div className="grid gap-3">
                      <DockMetric label="Official facts" value="Registers, warnings, and sanctions stay distinct" tone="positive" />
                      <DockMetric label="Inferred links" value="Confidence-scored and never silently merged" />
                      <DockMetric label="Coverage gaps" value="Explicitly shown as source unavailable" tone="warning" />
                    </div>
                  </ContextDockSection>
                </ContextDock>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
