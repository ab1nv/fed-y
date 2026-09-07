"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "./gsap";

/* ------------------------------------------------------------------ */
/* Network map — hand-built line art. Decorative, aria-hidden.        */
/* ------------------------------------------------------------------ */

function NetworkMap() {
  return (
    <div data-depth="14" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 rounded-full bg-[radial-gradient(closest-side,rgba(255,184,0,0.08),transparent)]"
      />
      <svg
        viewBox="0 0 620 520"
        aria-hidden="true"
        role="presentation"
        className="lm-map relative w-full"
      >
        <defs>
          <pattern id="lm-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="1.2" fill="var(--line)" />
          </pattern>
          <linearGradient id="lm-fade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--brand)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <rect width="620" height="520" fill="url(#lm-dots)" opacity="0.55" />

        {/* faint secondary lanes */}
        <g fill="none" stroke="var(--muted)" strokeWidth="1" opacity="0.28" className="lm-faint">
          <path d="M 150 120 C 220 90, 320 60, 560 70" strokeDasharray="1 7" />
          <path d="M 60 420 C 90 300, 80 200, 150 120" strokeDasharray="1 7" />
          <path d="M 330 220 C 420 300, 470 320, 540 340" strokeDasharray="1 7" />
        </g>

        {/* drawn lanes */}
        <g fill="none" strokeLinecap="round">
          <path className="lm-lane" d="M 60 420 C 180 380, 220 250, 330 220" stroke="url(#lm-fade)" strokeWidth="1.6" />
          <path className="lm-lane" d="M 330 220 C 450 195, 470 95, 560 70" stroke="url(#lm-fade)" strokeWidth="1.6" />
          <path id="lm-trunk" className="lm-lane" d="M 60 420 C 230 470, 410 435, 540 340" stroke="var(--brand)" strokeWidth="2" />
          <path className="lm-lane" d="M 330 220 C 275 150, 215 128, 150 120" stroke="url(#lm-fade)" strokeWidth="1.6" />
          <path className="lm-lane" d="M 560 70 C 592 175, 582 262, 540 340" stroke="var(--muted)" strokeWidth="1.4" opacity="0.5" />
        </g>

        {/* truck marker on trunk lane */}
        <g className="lm-truck" transform="translate(315,434)">
          <g>
            <rect x="-16" y="-8" width="19" height="12" rx="2" fill="var(--brand)" />
            <path d="M 3 -4 h 6 l 5 5 v 3 h -11 z" fill="var(--surface2)" stroke="var(--brand)" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="-9" cy="5.5" r="2.4" fill="var(--bg)" stroke="var(--brand)" strokeWidth="1.2" />
            <circle cx="8" cy="5.5" r="2.4" fill="var(--bg)" stroke="var(--brand)" strokeWidth="1.2" />
          </g>
        </g>

        {/* nodes */}
        <g className="lm-nodes">
          {[
            { x: 60, y: 420, l: "BOM" },
            { x: 150, y: 120, l: "MAA" },
            { x: 560, y: 70, l: "DEL" },
            { x: 540, y: 340, l: "HYD" },
          ].map((n) => (
            <g key={n.l} transform={`translate(${n.x},${n.y})`}>
              <circle className="lm-halo" r="5" fill="var(--brand)" opacity="0.25" />
              <circle className="lm-dot" r="3.2" fill="var(--ink)" />
              <text x="9" y="4" className="font-mono" fontSize="11" letterSpacing="1" fill="var(--muted)">
                {n.l}
              </text>
            </g>
          ))}
          {/* hub */}
          <g transform="translate(330,220)">
            <circle className="lm-halo" r="7" fill="var(--brand)" opacity="0.3" />
            <circle r="5.5" fill="var(--brand)" />
            <circle r="10" fill="none" stroke="var(--brand)" strokeWidth="1" opacity="0.5" strokeDasharray="2 4" />
            <text x="14" y="4" className="font-mono" fontSize="11" letterSpacing="1" fill="var(--ink)">
              NAG · HUB
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const splits: SplitText[] = [];
        if (title.current) {
          const split = new SplitText(title.current, { type: "lines", mask: "lines" });
          splits.push(split);
          gsap.from(split.lines, {
            yPercent: 118,
            duration: 0.95,
            stagger: 0.09,
            ease: "power4.out",
          });
        }

        gsap.from(".lm-lane", {
          drawSVG: 0,
          duration: 1.7,
          stagger: 0.14,
          ease: "power2.inOut",
          delay: 0.25,
        });

        gsap.from(".lm-nodes > g", {
          scale: 0,
          transformOrigin: "center",
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(2.2)",
          delay: 0.5,
        });

        gsap.to(".lm-halo", {
          scale: 2.6,
          opacity: 0,
          transformOrigin: "center",
          duration: 1.8,
          ease: "power1.out",
          stagger: { each: 0.45, repeat: -1 },
          delay: 1,
        });

        gsap.to(".lm-truck", {
          motionPath: { path: "#lm-trunk", align: "#lm-trunk", alignOrigin: [0.5, 0.5], autoRotate: true },
          duration: 7,
          ease: "none",
          repeat: -1,
          delay: 1.6,
        });

        gsap.from(
          ".lm-in",
          { y: 22, opacity: 0, duration: 0.6, stagger: 0.07, ease: "power2.out", delay: 0.15 },
        );

        // desktop-only parallax
        mm.add("(pointer: fine) and (min-width: 1024px)", () => {
          const el = root.current;
          if (!el) return;
          const layers = gsap.utils.toArray<HTMLElement>("[data-depth]");
          const qx = layers.map((l) => gsap.quickTo(l, "x", { duration: 0.6, ease: "power3" }));
          const qy = layers.map((l) => gsap.quickTo(l, "y", { duration: 0.6, ease: "power3" }));
          const onMove = (e: MouseEvent) => {
            const r = el.getBoundingClientRect();
            const nx = (e.clientX - r.left) / r.width - 0.5;
            const ny = (e.clientY - r.top) / r.height - 0.5;
            layers.forEach((l, i) => {
              const d = parseFloat(l.dataset.depth || "0");
              qx[i](nx * d);
              qy[i](ny * d);
            });
          };
          el.addEventListener("mousemove", onMove);
          return () => el.removeEventListener("mousemove", onMove);
        });

        return () => {
          splits.forEach((s) => s.revert());
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" aria-label="Intro" className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-y-12 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-12 lg:gap-x-8 lg:pt-24 lg:pb-28">
        <div className="lg:col-span-6 xl:col-span-5">
          <p className="lm-in font-mono text-[11px] tracking-[0.22em] text-muted uppercase">
            Logistics OS · Hubs · Lanes · POD
          </p>
          <h1
            ref={title}
            className="mt-5 font-display text-5xl leading-[1.04] font-bold tracking-tight text-balance sm:text-6xl xl:text-[4.6rem]"
          >
            Freight that thinks in lanes<span className="text-brand">.</span>
          </h1>
          <p className="lm-in mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            FedY plans, prices and audits every movement across your network — hub to
            doorstep, to the minute.
          </p>

          <div className="lm-in mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-brand-ink transition-transform hover:brightness-110 active:scale-[0.98]"
            >
              Start shipping
            </Link>
            <Link
              href="/track"
              className="rounded-md border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-muted/60 hover:bg-surface"
            >
              Track a parcel
            </Link>
          </div>

          <Link
            href="/track"
            className="lm-in group mt-10 inline-flex items-center gap-3 rounded-full border border-line bg-surface/80 py-1.5 pr-2 pl-4 font-mono text-xs text-muted transition-colors hover:border-brand/50 hover:text-ink"
          >
            <span className="tracking-wider">FDY-K3QM-8PWR</span>
            <span className="rounded-full bg-surface2 px-2.5 py-1 text-[10px] tracking-wider text-brand">
              IN TRANSIT
            </span>
            <span aria-hidden className="text-ink transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>

        <div className="lg:col-span-6 lg:col-start-7 xl:col-span-7">
          <NetworkMap />
        </div>
      </div>
    </section>
  );
}
