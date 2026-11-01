"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="marketing flex min-h-dvh flex-col items-center justify-center bg-bg px-5 text-ink">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-400">
          Something went wrong
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold">We could not load this screen.</h1>
        <p className="mt-2 text-sm text-muted">
          {error.message || "The request failed. Try again in a moment."}
        </p>
        <button
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-ink transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
