"use client";

import Link from "next/link";
import Image from "next/image";
import { Braces, House, LogIn, Orbit, ScrollText, Search, Siren, TowerControl, WalletCards } from "lucide-react";

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

export function MarketingNav({ activePath = "/" }: { activePath?: string }) {
  return (
    <header className="sticky top-0 z-40 rounded-[28px] border border-white/10 bg-[rgba(4,9,12,0.72)] px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-lg transition-transform group-hover:scale-105">
              <Image
                src="/voto-logo.png"
                alt="VOTO logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
          </Link>
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
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    active
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white",
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
  );
}
