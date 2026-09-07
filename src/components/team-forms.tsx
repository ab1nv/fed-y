"use client";

import { useActionState } from "react";
import { createTeamUserAction, removeTeamUserAction } from "@/lib/fleet-actions";
import type { FormState } from "@/lib/auth-actions";
import { Button, Field, Input, Select } from "@/components/ui";

export function AddTeamUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createTeamUserAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Field label="Name">
        <Input name="name" required placeholder="Neel Kapoor" autoComplete="off" />
      </Field>
      <Field label="Username">
        <Input name="username" required placeholder="neel" autoComplete="off" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required placeholder="neel@fedy.io" autoComplete="off" />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="DISPATCHER">
          <option value="DISPATCHER">Dispatcher</option>
          <option value="DRIVER">Driver</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </Field>
      <Field label="Temp password">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <div className="sm:col-span-2 xl:col-span-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Add member"}</Button>
        {state?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      </div>
    </form>
  );
}

export function RemoveUserButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={removeTeamUserAction}
      onSubmit={(e) => {
        if (!confirm(`Remove ${name} and all their data?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button variant="ghost" size="sm" type="submit" className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400">
        Remove
      </Button>
    </form>
  );
}
