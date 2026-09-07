"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "./gsap";

const panels = [
  {
    no: "01",
    title: "Scattered freight",
    body: "Stock split across forty third-party warehouses, none of them yours. One ledger, one truth — every consignment in the same book.",
    art: (
      <svg viewBox="0 0 120 80" aria-hidden="true" className="h-20 w-auto">
        <g fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinejoin="round">
          <rect x="10" y="34" width="22" height="18" transform="rotate(-14 21 43)" />
          <rect x="44" y="44" width="18" height="15" transform="rotate(9 53 51)" />
          <rect x="70" y="26" width="24" height="20" transform="rotate(-6 82 36)" className="ps-box" />
          <path d="M 10 43 h 22 M 70 36 h 24" />
        </g>
        <circle cx="60" cy="14" r="2" fill="var(--brand)" />
        <path d="M 60 18 v 6 M 56 22 h 8" stroke="var(--brand)" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
  {
    no: "02",
    title: "Blind dispatch",
    body: "You learn about the delay from the customer's email. FedY recomputes ETAs per lane, per hour — before the call ever comes.",
    art: (
      <svg viewBox="0 0 120 80" aria-hidden="true" className="h-20 w-auto">
        <g fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round">
          <path d="M 12 60 C 36 60, 38 20, 60 20 C 82 20, 84 60, 108 60" />
          <path d="M 24 68 h 72" strokeDasharray="2 6" />
          <circle cx="60" cy="20" r="3" className="ps-eye" fill="var(--brand)" stroke="none" />
          <path d="M 48 20 q 12 -12 24 0 q -12 12 -24 0 z" />
        </g>
        <path d="M 100 12 l 8 8 M 108 12 l -8 8" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    no: "03",
    title: "Paper EDI",
    body: "Manifests as spreadsheet attachments, PODs in a plastic file. FedY parses ASNs and reconciles proofs automatically, line by line.",
    art: (
      <svg viewBox="0 0 120 80" aria-hidden="true" className="h-20 w-auto">
        <g fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round">
          <rect x="34" y="12" width="42" height="54" rx="2" />
          <path d="M 42 26 h 26 M 42 36 h 26 M 42 46 h 16" />
          <path d="M 76 12 l 12 10 h -12 z" />
          <path d="M 20 44 l 8 8 l 16 -18" stroke="var(--brand)" strokeWidth="2" className="ps-check" />
          <circle cx="96" cy="52" r="10" stroke="var(--brand)" strokeDasharray="3 4" />
        </g>
      </svg>
    ),
  },
];

export default function Problems() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".ps-card", {
          x: 64,
          opacity: 0,
          duration: 0.65,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: { trigger: root.current, start: "top 82%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="problem" aria-labelledby="problem-h" className="border-t border-line">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="problem-h" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your network leaks.
            <span className="block text-muted">We stopped it at the seams.</span>
          </h2>
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted uppercase">
            01 / the problem
          </p>
        </div>

        <ul className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {panels.map((p) => (
            <li
              key={p.no}
              className="ps-card w-[86%] shrink-0 snap-start rounded-xl border border-line bg-surface p-7 transition-colors hover:border-muted/40 sm:w-[56%] lg:w-[calc((100%-2.5rem)/3)]"
            >
              {p.art}
              <p className="mt-8 font-mono text-[11px] tracking-[0.22em] text-brand">
                {p.no}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
