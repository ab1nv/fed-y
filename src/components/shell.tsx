"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/auth-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { cx } from "@/components/ui";

type NavItem = { href: string; label: string; icon: React.ReactNode; roles: string[] };

const icon = (d: string) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", roles: ["ADMIN", "DISPATCHER"], icon: icon("M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6ZM13 9h8V3h-8v6Z") },
  {
    href: "/dashboard/shipments",
    label: "Shipments",
    roles: ["ADMIN", "DISPATCHER"],
    icon: icon("M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7ZM3 8.5 12 14m0 0 9-5.5M12 14v7"),
  },
  {
    href: "/dashboard/fleet",
    label: "Fleet",
    roles: ["ADMIN", "DISPATCHER"],
    icon: icon("M1 8h13v9H1zM14 11h4l3 3v3h-7M5.5 20a2 2 0 1 0 0-.01M18 20a2 2 0 1 0 0-.01"),
  },
  {
    href: "/dashboard/warehouses",
    label: "Warehouses",
    roles: ["ADMIN", "DISPATCHER"],
    icon: icon("M3 21V8l9-5 9 5v13M9 21v-8h6v8M3 21h18"),
  },
  { href: "/dashboard/customers", label: "Customers", roles: ["ADMIN", "DISPATCHER"], icon: icon("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm15 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75") },
  { href: "/admin/team", label: "Team", roles: ["ADMIN"], icon: icon("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75") },
  { href: "/driver", label: "My stops", roles: ["DRIVER"], icon: icon("M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z") },
];

export function Shell({
  user,
  children,
}: {
  user: { name: string; username: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(user.role));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href={user.role === "DRIVER" ? "/driver" : "/dashboard"} className="font-display text-xl font-bold tracking-tight">
          Fed<span className="text-brand">Y</span>
        </Link>
        <button className="lg:hidden text-muted" onClick={() => setOpen(false)} aria-label="Close menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-3" aria-label="Main">
        {items.map((n) => {
          const active = n.href === "/dashboard" ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface2 hover:text-ink",
              )}
            >
              {n.icon}
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
            {user.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs uppercase tracking-wide text-muted">{user.role.toLowerCase()}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="w-full rounded-lg border border-line py-1.5 text-xs font-medium text-muted transition hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur lg:px-8">
          <button className="text-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
