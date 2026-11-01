"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./shipment-map";

const ShipmentMap = dynamic(() => import("./shipment-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[360px] w-full place-items-center rounded-xl border border-line bg-surface text-sm text-muted">
      Loading map…
    </div>
  ),
});

export function MapPanel({ points }: { points: MapPoint[] }) {
  const live = points.filter((p) => p.live).length;
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Live map
        </h2>
        <p className="text-xs text-muted">
          <span className="mr-3 inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-brand" aria-hidden /> live
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-blue-500" aria-hidden /> destination
          </span>
          {live > 0 && <span className="ml-3 text-emerald-600 dark:text-emerald-400">{live} moving</span>}
        </p>
      </div>
      {points.length === 0 ? (
        <div className="grid h-[360px] place-items-center rounded-xl border border-line text-sm text-muted">
          No locations to show yet.
        </div>
      ) : (
        <ShipmentMap points={points} />
      )}
    </div>
  );
}
