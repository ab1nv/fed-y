import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logoutAction } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { PendingButton } from "@/components/pending-button";

export const metadata = { title: "My stops — FedY" };

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const driver = await db.driver.findUnique({
    where: { userId: session.sub },
    include: { vehicle: true },
  });
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur">
        <span className="font-display text-lg font-bold">Fed<span className="text-brand">Y</span></span>
        <span className="ml-auto text-right text-[11px] leading-tight text-muted">
          <span className="block font-medium text-ink">{session.name}</span>
          {driver?.vehicle ? `${driver.vehicle.type} ${driver.vehicle.plateNo}` : "no vehicle"}
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
