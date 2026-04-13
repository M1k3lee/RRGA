import Link from "next/link";

import { ShellFrame } from "@/components/shell-frame";

export default function SignInPage() {
  return (
    <ShellFrame activePath="/sign-in" eyebrow="Access and onboarding" title="Sign in">
      <div className="space-y-4">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Current access model</p>
          <h2 className="mt-4 font-[var(--font-display)] text-3xl text-white">Customer access is currently provisioned through issued credentials.</h2>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-white/65">
            VOTO already supports API-key based access for authenticated surfaces. Full customer sign-in and account
            management can be layered on top without changing the product architecture.
          </p>
          <p className="mt-3 text-sm leading-7 text-white/55">
            Verified Oversight &amp; Trust Oracle is provisioned today through issued credentials while the broader
            customer account layer is finalized.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/api"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
            >
              Request API access
            </Link>
            <Link
              href="/watchlists"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:text-white"
            >
              Open watchlists
            </Link>
          </div>
        </section>
      </div>
    </ShellFrame>
  );
}
