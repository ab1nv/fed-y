"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "./gsap";

const CODE = "FDY-K3QM-8PWR";

export default function Spotlight() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const code = root.current?.querySelector<HTMLElement>(".st-code");
      if (!code) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
        tl.set(code, { text: "", opacity: 1 })
          .to(".st-chip", { opacity: 0, y: 6, duration: 0 })
          .to(".st-scans > *", { opacity: 0, duration: 0 }, 0)
          .to(code, { text: CODE, duration: 1.15, ease: "none", delay: 0.35 })
          .to(".st-chip", { opacity: 1, y: 0, duration: 0.4, ease: "back.out(2.4)" })
          .to(
            ".st-scans > *",
            { opacity: 1, y: 0, duration: 0.45, stagger: 0.18, ease: "power2.out" },
            "-=0.1",
          );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="tracking" aria-labelledby="tracking-h" className="border-t border-line bg-surface/40">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted uppercase">
            03 / tracking
          </p>
          <h2 id="tracking-h" className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            A consignment number
            <span className="block text-muted">should answer everything.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            Type a code, get the whole story: last scan, lane position, recomputed ETA and
            the POD on file. Same payload your customers see — no support ticket in
            between.
          </p>
          <ul className="st-list mt-8 space-y-3 text-sm text-muted">
            {[
              "Geo-stamped scans from hubs and line-haul",
              "ETA recomputed hourly per lane",
              "Proof-of-delivery with OTP + photo",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3 shrink-0" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 2 6.5 l 2.6 2.6 L 10 3.5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-bg p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <label className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
              Waybill
            </label>
            <span className="st-code font-mono text-lg tracking-wider text-ink">
              {CODE}
            </span>
            <span className="st-caret -ml-2 inline-block h-5 w-[2px] bg-brand" aria-hidden />
            <span className="st-chip ml-auto rounded-full bg-brand px-3 py-1 text-[11px] font-semibold tracking-wider text-brand-ink">
              OUT FOR DELIVERY · ETA 14:20
            </span>
          </div>

          <div className="mt-6 h-px bg-line" />

          <ol className="st-scans mt-6 space-y-4 font-mono text-xs">
            {[
              ["11:02", "Departed NAGPUR HUB · line-haul NH-6"],
              ["13:41", "Arrived ITWARI FACILITY · sorted"],
              ["14:05", "Out for delivery · vehicle MH-31-ET-4402"],
            ].map(([t, s]) => (
              <li key={t} className="flex gap-4">
                <span className="shrink-0 text-brand">{t}</span>
                <span className="text-muted">{s}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex items-center gap-2 text-[11px] text-muted">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Live · 1.4k vehicles reporting
          </div>
        </div>
      </div>
    </section>
  );
}
