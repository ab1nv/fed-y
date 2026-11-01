"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import type { FormState } from "@/lib/auth-actions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ActionForm({
  action,
  hidden,
  children,
  submitLabel,
  pendingLabel = "Working…",
  variant = "primary",
  size = "sm",
  className,
  buttonClassName,
  confirmText,
}: {
  action: Action;
  hidden?: Record<string, string>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  buttonClassName?: string;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className={className}
      onSubmit={
        confirmText
          ? (event) => {
              if (!confirm(confirmText)) event.preventDefault();
            }
          : undefined
      }
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <Button
        type="submit"
        size={size}
        variant={variant}
        disabled={pending}
        className={buttonClassName}
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
      {state?.error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
