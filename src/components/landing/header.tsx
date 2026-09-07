import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="FedY home"
          className="font-display text-xl font-bold tracking-tight"
        >
          Fed<span className="text-brand">Y</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          <Link
            href="#product"
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            Platform
          </Link>
          <Link
            href="#tracking"
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            Tracking
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            Sign in
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-ink md:hidden"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-ink transition-transform hover:brightness-110 active:scale-[0.98]"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
