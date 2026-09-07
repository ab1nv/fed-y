import Link from "next/link";

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const buttonStyles = {
  primary: "bg-brand text-brand-ink hover:opacity-90 focus-visible:outline-brand",
  secondary: "bg-surface border border-line text-ink hover:bg-surface2 focus-visible:outline-brand",
  ghost: "text-muted hover:text-ink hover:bg-surface2",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: keyof typeof buttonStyles;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background,color,opacity,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

const control =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/25";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cx("h-10", control, className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cx("h-10", control, "appearance-auto", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cx("min-h-20 py-2", control, className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cx(
        "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  CREATED: { label: "Created", cls: "bg-zinc-400/15 text-zinc-500 dark:text-zinc-400" },
  ASSIGNED: { label: "Assigned", cls: "bg-sky-500/12 text-sky-700 dark:text-sky-400" },
  PICKED_UP: { label: "Picked up", cls: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-400" },
  IN_TRANSIT: { label: "In transit", cls: "bg-blue-500/12 text-blue-700 dark:text-blue-400" },
  OUT_FOR_DELIVERY: {
    label: "Out for delivery",
    cls: "bg-violet-500/12 text-violet-700 dark:text-violet-400",
  },
  DELIVERED: { label: "Delivered", cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  EXCEPTION: { label: "Exception", cls: "bg-red-500/12 text-red-700 dark:text-red-400" },
  CANCELLED: { label: "Cancelled", cls: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, cls: "bg-zinc-400/15 text-zinc-500" };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        m.cls,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {m.label}
    </span>
  );
}

export function RiskBadge({ level }: { level: "none" | "low" | "medium" | "high" }) {
  if (level === "none" || level === "low")
    return <span className="text-xs text-muted">—</span>;
  const cls =
    level === "high"
      ? "bg-red-500/12 text-red-700 dark:text-red-400 ring-red-500/30"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/30";
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1",
        cls,
      )}
    >
      {level === "high" ? "At risk" : "Watch"}
    </span>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cx("font-display text-xl font-bold tracking-tight", className)}>
      Fed<span className="text-brand">Y</span>
      <span className="sr-only"> — home</span>
    </Link>
  );
}

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(d);
}
export function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
export function fmtWeight(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${kg.toFixed(1)} kg`;
}
