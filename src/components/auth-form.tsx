"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type FormState } from "@/lib/auth-actions";
import { Button, Input, Label, Logo, Select } from "@/components/ui";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);

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

        <form action={formAction} className="mt-8 space-y-4">
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
              <Input id="username" name="username" autoComplete="username" required autoFocus />
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

        {mode === "login" && (
          <p className="mt-8 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted">
            Demo accounts — <span className="font-mono">admin</span> / <span className="font-mono">priya</span>{" "}
            (dispatcher) / <span className="font-mono">ravi</span> (driver) — password{" "}
            <span className="font-mono">password123</span>
          </p>
        )}
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
