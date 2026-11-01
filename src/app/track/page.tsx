import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";

export const metadata = { title: "Track a shipment — FedY" };
export const dynamic = "force-dynamic";

export default function TrackHome() {
  return (
    <main className="marketing flex min-h-dvh flex-col bg-bg text-ink">
      <header className="flex h-16 items-center justify-between px-5 lg:px-10">
        <Logo />
        <Link href="/" className="text-sm text-muted transition hover:text-ink">← Back to site</Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">FedY tracking</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Where is my parcel?
          </h1>
          <form
            action={async (fd) => {
              "use server";
              const code = String(fd.get("code") ?? "").trim().toUpperCase();
              redirect(code ? `/track/${encodeURIComponent(code)}` : "/track");
            }}
            className="mt-8 flex gap-2"
          >
            <input
              name="code"
              required
              autoFocus
              placeholder="FDY-XXXX-XXXX"
              aria-label="Tracking code"
              className="h-12 flex-1 rounded-xl border border-line bg-surface px-4 font-mono text-sm uppercase tracking-widest text-ink outline-none placeholder:text-muted/60 focus:border-brand/60 focus:ring-2 focus:ring-brand/25"
            />
            <button className="h-12 rounded-xl bg-brand px-6 text-sm font-semibold text-brand-ink transition hover:opacity-90">
              Track
            </button>
          </form>
          <p className="mt-4 text-xs text-muted">
            Tracking codes are on your confirmation email. Example from the demo dataset:{" "}
            <ExampleCode />
          </p>
        </div>
      </div>
    </main>
  );
}

import { db } from "@/lib/db";
import { cache } from "react";

const example = cache(async () => {
  const s = await db.shipment.findFirst({
    where: { status: { in: ["IN_TRANSIT", "OUT_FOR_DELIVERY"] } },
    select: { trackingCode: true },
    orderBy: { updatedAt: "desc" },
  });
  return s?.trackingCode;
});

async function ExampleCode() {
  const code = await example();
  if (!code) return <span className="text-ink">FDY-…</span>;
  return (
    <Link href={`/track/${code}`} className="font-mono text-brand underline-offset-4 hover:underline">
      {code}
    </Link>
  );
}
