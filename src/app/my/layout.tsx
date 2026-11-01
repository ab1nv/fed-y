import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logoutAction } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { PendingButton } from "@/components/pending-button";

export const metadata = { title: "My shipments — FedY" };

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["CUSTOMER"]);
  const customer = await db.customer.findUnique({
    where: { userId: session.sub },
    select: { city: true },
  });
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur">
        <span className="font-display text-lg font-bold">Fed<span className="text-brand">Y</span></span>
        <span className="ml-auto text-right text-[11px] leading-tight text-muted">
          <span className="block font-medium text-ink">{session.name}</span>
          {customer?.city ?? "customer"}
        </span>
        <ThemeToggle />
        <form action={logoutAction}>
          <PendingButton className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:text-ink" pendingLabel="…">
            Exit
          </PendingButton>
        </form>
      </header>
      {children}
    </div>
  );
}
