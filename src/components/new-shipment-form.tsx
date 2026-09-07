"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createShipmentAction } from "@/lib/shipment-actions";
import type { FormState } from "@/lib/auth-actions";
import { Button, Field, Input, Select } from "@/components/ui";

export function NewShipmentForm({
  customers,
  warehouses,
  defaultPromised,
}: {
  customers: { id: string; name: string; city: string }[];
  warehouses: { id: string; name: string; code: string }[];
  defaultPromised: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createShipmentAction, null);

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Field label="Customer">
        <Select name="customerId" required defaultValue="">
          <option value="" disabled>Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
          ))}
        </Select>
      </Field>
      <Field label="Origin warehouse">
        <Select name="originId" required defaultValue="">
          <option value="" disabled>Select origin…</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Destination address">
          <Input name="destinationAddress" required placeholder="142, Ring Road 4, Indore" />
        </Field>
      </div>
      <Field label="Destination city">
        <Input name="destinationCity" required placeholder="Indore" />
      </Field>
      <Field label="Weight (kg)">
        <Input name="weightKg" type="number" step="0.1" min="0.1" required placeholder="12.5" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Promised delivery" hint="Dispatcher promised window shown to the customer.">
          <Input name="promisedDate" type="datetime-local" required defaultValue={defaultPromised} />
        </Field>
      </div>
      {state?.error && (
        <p role="alert" className="sm:col-span-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Creating…" : "Create shipment"}</Button>
        <Link href="/dashboard/shipments" className="inline-flex h-12 items-center rounded-lg border border-line px-5 text-sm font-medium text-muted transition hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
