"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionState {
  ok?: boolean;
  error?: string;
  /** one-time secret to display (e.g. a newly issued temp password) */
  tempPassword?: string;
  /** free-form info line */
  info?: string;
}

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Generic server-action form: renders children (server-rendered fields), a submit button,
 * pending state, error line, success toast, and an optional one-time temp-password box.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  successMessage,
  className,
  variant = "default",
  confirmMessage,
  hideButton,
  resetOnSuccess,
}: {
  action: Action;
  children?: React.ReactNode;
  submitLabel: string;
  successMessage?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  confirmMessage?: string;
  hideButton?: boolean;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const lastState = useRef<ActionState>(state);

  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (state.ok && successMessage) toast.success(successMessage);
    if (state.ok && resetOnSuccess) formRef.current?.reset();
    if (state.error) toast.error(state.error);
  }, [state, successMessage, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn("space-y-4", className)}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.info && <p className="text-sm text-muted-foreground">{state.info}</p>}
      {state.tempPassword && (
        <div className="rounded-lg border border-brand-gold bg-amber-50 p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">Temporary password — shown once</div>
          <code className="mt-1 block select-all text-lg font-bold tracking-wider text-brand-navy">{state.tempPassword}</code>
        </div>
      )}
      {!hideButton && (
        <Button type="submit" variant={variant} disabled={pending}>
          {pending ? "…" : submitLabel}
        </Button>
      )}
    </form>
  );
}
