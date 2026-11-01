"use client";

import { useActionState } from "react";
import { createWarehouseAction } from "@/lib/fleet-actions";
import type { FormState } from "@/lib/auth-actions";
import { Button, Field, Input } from "@/components/ui";

export function AddWarehouseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWarehouseAction, null);
  return (
    <form action={action} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Field label="Name">
        <Input name="name" required placeholder="Pune West Hub" />
      </Field>
      <Field label="Code">
        <Input name="code" required placeholder="PNQ-W1" />
      </Field>
      <Field label="Address">
        <Input name="address" required placeholder="Plot 9, Hinjewadi Phase 1" />
      </Field>
      <Field label="City">
        <Input name="city" required placeholder="Pune" />
      </Field>
      <div className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Lat / Lng
        </span>
        <div className="flex gap-2">
          <Input name="lat" aria-label="Latitude" type="number" step="any" min="-90" max="90" required placeholder="18.59" />
          <Input name="lng" aria-label="Longitude" type="number" step="any" min="-180" max="180" required placeholder="73.73" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add warehouse"}</Button>
      {state?.error && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2 lg:col-span-6 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
