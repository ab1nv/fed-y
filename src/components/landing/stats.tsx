"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "./gsap";

const DEFAULT_STATS = [
  { target: 0, dec: 1, suffix: "%", label: "On-time delivery" },
  { target: 0, dec: 0, suffix: "", label: "Shipments booked" },
  { target: 0, dec: 0, suffix: "", label: "Drivers on the app" },
  { target: 0, dec: 0, suffix: "", label: "Active hubs" },
];

export default function Stats({ stats = DEFAULT_STATS }: { stats?: typeof DEFAULT_STATS }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        root.current
          ?.querySelectorAll<HTMLElement>("[data-target]")
          .forEach((el) => {
            const target = parseFloat(el.dataset.target || "0");
            const dec = parseInt(el.dataset.dec || "0", 10);
            const obj = { v: 0 };
            gsap.to(obj, {
              v: target,
              duration: 1.6,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
              onUpdate: () => {
                el.textContent = obj.v.toFixed(dec);
              },
            });
            gsap.from(el.closest("div")!, {
              opacity: 0,
              y: 18,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            });
          });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-label="Network numbers" className="border-t border-line">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-16 sm:px-8">
        <p className="text-right font-mono text-[10px] tracking-[0.18em] text-muted/70 uppercase">
          Snapshot from the seeded network
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="font-display text-5xl font-bold tracking-tight tabular-nums xl:text-6xl">
                <span data-target={s.target} data-dec={s.dec}>
                  {s.target.toFixed(s.dec)}
                </span>
                <span className="text-brand">{s.suffix}</span>
              </dd>
              <dt className="mt-3 border-t border-line pt-3 text-sm text-muted">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
