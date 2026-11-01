"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { loginAction, signupAction, type FormState } from "@/lib/auth-actions";
import { Button, Input, Label, Logo, Select, cx } from "@/components/ui";

const DEMO_ACCOUNTS = [
  {
    username: "admin",
    name: "Aarav Mehta",
    role: "Admin",
    blurb: "Everything + Team",
    key: "admin",
  },
  {
    username: "priya",
    name: "Priya Sharma",
    role: "Dispatcher",
    blurb: "Dispatch + warehouse ops",
    key: "dispatcher",
  },
  {
    username: "ravi",
    name: "Ravi Kumar",
    role: "Driver",
    blurb: "Mobile stops + GPS",
    key: "driver",
  },
] as const;

const DEMO_PASSWORD = "password123";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const [creds, setCreds] = useState({ username: "", password: "" });
  const [picked, setPicked] = useState<string | null>(null);

  function pickDemo(username: string, key: string) {
    setCreds({ username, password: DEMO_PASSWORD });
    setPicked(key);
  }

  return (
    <main className="marketing flex min-h-dvh flex-col items-center justify-center bg-bg px-5 py-16 text-ink">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-between">
          <Logo className="text-2xl" />
          <Link
            href={mode === "login" ? "/signup" : "/login"}
            className="text-sm text-muted transition hover:text-ink"
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </Link>
        </div>

        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
          {mode === "login" ? "Sign in to FedY" : "Create your FedY account"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {mode === "login"
            ? "Dispatch, drivers and customers — one network."
            : "Dispatcher or driver access. Admin accounts are provisioned internally."}
        </p>

        {mode === "login" && (
          <section className="mt-6" aria-label="Demo accounts">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Try a demo profile
            </p>
            <div className="mt-2 grid gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => pickDemo(a.username, a.key)}
                  aria-pressed={picked === a.key}
                  className={cx(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                    picked === a.key
                      ? "border-brand/60 bg-brand/10"
                      : "border-line bg-surface hover:border-brand/40 hover:bg-surface2",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{a.role}</span>
                    <span className="block truncate text-xs text-muted">
                      {a.name} · {a.blurb}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-brand">{a.username}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Password for every demo profile: <span className="font-mono text-ink">password123</span>
            </p>
          </section>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" autoComplete="name" required placeholder="Priya Sharma" />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" autoComplete="username" required placeholder="priya" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required placeholder="priya@company.in" />
              </div>
              <div>
                <Label htmlFor="role">I am a</Label>
                <Select id="role" name="role" defaultValue="DISPATCHER">
                  <option value="DISPATCHER">Dispatcher / Ops</option>
                  <option value="DRIVER">Driver</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">Phone (drivers only)</Label>
                <Input id="phone" name="phone" autoComplete="tel" placeholder="+91 98110 22334" />
              </div>
            </>
          )}
          {mode === "login" && (
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                autoFocus
                value={creds.username}
                onChange={(e) => {
                  setCreds((c) => ({ ...c, username: e.target.value }));
                  setPicked(null);
                }}
              />
            </div>
          )}
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={mode === "login" ? creds.password : undefined}
              onChange={
                mode === "login"
                  ? (e) => {
                      setCreds((c) => ({ ...c, password: e.target.value }));
                      setPicked(null);
                    }
                  : undefined
              }
            />
          </div>
          {next && <input type="hidden" name="next" value={next} />}
          {state?.error && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Just tracking a parcel?{" "}
          <Link href="/track" className="text-brand underline-offset-4 hover:underline">
            Public tracking
          </Link>
        </p>
      </div>
    </main>
  );
}
