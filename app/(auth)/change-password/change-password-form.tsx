"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, type ChangePasswordState } from "./actions";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, {});

  const errorText =
    state.error === "weak" ? t("passwordTooWeak") : state.error === "mismatch" ? t("passwordMismatch") : state.error;

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        <p className="text-xs text-muted-foreground">{t("passwordRule")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t("confirmPassword")}</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </div>
      {errorText && <p className="text-sm text-destructive">{errorText}</p>}
      <div className="flex gap-3">
        <Button type="submit" className="flex-1" size="lg" disabled={pending}>
          {pending ? t("changing") : t("changePassword")}
        </Button>
        {!forced && (
          <Button render={<Link href="/dashboard" />} variant="outline" size="lg">
            {tc("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
