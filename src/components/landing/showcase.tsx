"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "./gsap";

/* ---------------- mockups: pure CSS/SVG, decorative ---------------- */

function TimelineMock() {
  const steps = [
    ["Booked", "09:12", false],
    ["Picked up", "11:40", false],
    ["Line-haul · BOM→NAG", "14:05", true],
    ["Out for delivery", "—", false],
    ["POD captured", "—", false],
  ] as const;
  return (
    <div aria-hidden className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-wider text-muted">FDY-7211-QZ</span>
        <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-brand-ink">
          IN TRANSIT
        </span>
      </div>
      <ol className="mt-5 space-y-0">
        {steps.map(([label, time, active], i) => (
          <li key={label} className="relative flex items-start gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span className="absolute top-4 left-[5px] h-full w-px bg-line" />
            )}
            <span
              className={`mt-1 h-[11px] w-[11px] shrink-0 rounded-full border ${
                active ? "border-brand bg-brand" : "border-line bg-surface2"
              }`}
            />
            <span className={`text-sm ${active ? "text-ink" : "text-muted"}`}>{label}</span>
            <span className="ml-auto font-mono text-xs text-muted">{time}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function KpiMock() {
  return (
    <div aria-hidden className="rounded-xl border border-line bg-surface p-5">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
        On-time · 7 days
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold tracking-tight">98.6</span>
        <span className="text-lg text-muted">%</span>
        <span className="ml-auto font-mono text-xs text-brand">+1.2 WoW</span>
      </div>
      <svg viewBox="0 0 240 72" className="mt-4 w-full" fill="none">
        <path
          d="M 2 58 L 26 50 L 50 54 L 74 38 L 98 44 L 122 28 L 146 33 L 170 20 L 194 24 L 218 10 L 236 14"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 2 58 L 26 50 L 50 54 L 74 38 L 98 44 L 122 28 L 146 33 L 170 20 L 194 24 L 218 10 L 236 14 L 236 72 L 2 72 Z"
          fill="var(--brand)"
          opacity="0.07"
        />
        <circle cx="236" cy="14" r="3" fill="var(--brand)" />
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          ["Avg dwell", "38 min"],
          ["Failed PODs", "11"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface2 px-3 py-2">
            <p className="text-[11px] text-muted">{k}</p>
            <p className="font-mono text-sm">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StopMock() {
  return (
    <div aria-hidden className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
          Stop 14 / 22
        </span>
        <span className="font-mono text-xs text-brand">ETA 08 min</span>
      </div>
      <p className="mt-3 text-sm leading-snug">
        Unit 7, MIDC Phase II
        <span className="block text-muted">Butibori, Nagpur 440016</span>
      </p>
      <div className="mt-4 h-px bg-line" />
      <ul className="mt-4 space-y-2 text-sm text-muted">
        <li className="flex items-center gap-2.5">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M 3 8.5 l 3.5 3.5 L 13 5" />
          </svg>
          2 cartons · 18 kg
        </li>
        <li className="flex items-center gap-2.5">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M 3 8.5 l 3.5 3.5 L 13 5" />
          </svg>
          OTP captured
        </li>
        <li className="flex items-center gap-2.5">
          <span className="h-4 w-4 shrink-0 rounded-full border border-line" />
          Photo POD pending
        </li>
      </ul>
      <div className="mt-5 rounded-md bg-brand py-2.5 text-center text-sm font-semibold text-brand-ink opacity-90">
        Mark delivered
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- */

export default function Showcase() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".sc-card", {
          y: 70,
          rotateX: 22,
          opacity: 0,
          transformPerspective: 1100,
          transformOrigin: "center bottom",
          duration: 1,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        });
        gsap.from(".sc-head", {
          y: 26,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="product" aria-labelledby="product-h" className="border-t border-line">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="sc-head flex flex-wrap items-end justify-between gap-4">
          <h2 id="product-h" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            The console your ops
            <span className="block text-muted">lead actually opens.</span>
          </h2>
          <p className="font-mono text-[11px] tracking-[0.22em] text-muted uppercase">
            02 / the product
          </p>
        </div>

        <div className="mt-14 grid items-start gap-5 [perspective:1400px] sm:grid-cols-2 lg:grid-cols-3">
          <div className="sc-card">
            <TimelineMock />
          </div>
          <div className="sc-card lg:mt-12">
            <StopMock />
          </div>
          <div className="sc-card sm:col-span-2 lg:col-span-1 lg:mt-4">
            <KpiMock />
          </div>
        </div>

        <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted">
          Illustrative preview of the console. The live app computes every number from
          the database: timeline, KPIs and the driver&apos;s stop sheet. Same data, one pipeline: EDI in, events out, POD proof at the end of the
          lane.
        </p>
      </div>
    </section>
  );
}
