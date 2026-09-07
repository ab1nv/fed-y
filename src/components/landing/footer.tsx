"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "./gsap";

export default function CtaFooter() {
  const cta = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".fc-line", {
          yPercent: 110,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: cta.current, start: "top 75%", once: true },
        });
      });
    },
    { scope: cta },
  );

  return (
    <>
      <section
        ref={cta}
        aria-labelledby="cta-h"
        className="relative overflow-hidden border-t border-line"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[340px] bg-[radial-gradient(60%_100%_at_50%_100%,rgba(255,184,0,0.09),transparent)]"
        />
        <div className="mx-auto w-full max-w-[1400px] px-5 py-24 text-center sm:px-8 lg:py-32">
          <h2 id="cta-h" className="mx-auto max-w-3xl overflow-hidden font-display text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl xl:text-6xl">
            <span className="fc-line block">Put every lane</span>
            <span className="fc-line block">
              on the record<span className="text-brand">.</span>
            </span>
          </h2>
          <div className="fc-line mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-md bg-brand px-7 py-3 text-sm font-semibold text-brand-ink transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              Start shipping
            </Link>
            <Link
              href="/track"
              className="rounded-md border border-line px-7 py-3 text-sm font-medium text-ink transition-colors hover:border-muted/60 hover:bg-surface"
            >
              Track a parcel
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface/30">
        <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">
              Fed<span className="text-brand">Y</span>
            </p>
            <p className="mt-3 max-w-[24ch] text-sm leading-relaxed text-muted">
              Routing, pricing and proof for freight networks.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              Product
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ["Platform", "/login"],
                ["Create account", "/signup"],
                ["Track a shipment", "/track"],
              ].map(([l, h]) => (
                <li key={l}>
                  <Link href={h as string} className="text-ink/80 transition-colors hover:text-brand">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              Company
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {["About", "Careers", "Press"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-ink/80 transition-colors hover:text-brand">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              Status
            </p>
            <p className="mt-4 flex items-center gap-2.5 text-sm">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-emerald-300">All systems operational</span>
            </p>
            <p className="mt-3 font-mono text-[11px] text-muted/70">
              uptime 99.98% · 30d
            </p>
          </div>
        </div>

        <div className="border-t border-line/60">
          <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-muted/80 sm:px-8">
            <p>© 2026 FedY Logistics Pvt Ltd. All rights reserved.</p>
            <p className="font-mono">Built for the long haul.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
