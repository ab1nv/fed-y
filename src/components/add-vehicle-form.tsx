"use client";

import { useActionState } from "react";
import { createVehicleAction } from "@/lib/fleet-actions";
import type { FormState } from "@/lib/auth-actions";
import { Button, Field, Input, Select } from "@/components/ui";

export function AddVehicleForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createVehicleAction, null);
  return (
    <form action={action} className="grid items-end gap-3 sm:grid-cols-5">
      <Field label="Plate no.">
        <Input name="plateNo" required placeholder="KA03XY4455" />
      </Field>
      <Field label="Type">
        <Select name="type" defaultValue="Van">
          <option>Van</option>
          <option>Truck</option>
          <option>Bike</option>
        </Select>
      </Field>
      <Field label="Capacity (kg)">
        <Input name="capacityKg" type="number" min="1" required placeholder="1500" />
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue="AVAILABLE">
          <option value="AVAILABLE">Available</option>
          <option value="ON_ROUTE">On route</option>
          <option value="MAINTENANCE">Maintenance</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add vehicle"}</Button>
      {state?.error && <p role="alert" className="text-sm text-red-600 sm:col-span-5 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
