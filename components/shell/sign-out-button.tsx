"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

type ButtonProps = React.ComponentProps<typeof Button>;

export function SignOutButton(props: Omit<ButtonProps, "onClick" | "children">) {
  const t = useTranslations("nav");
  return (
    <Button {...props} onClick={() => signOut()}>
      <LogOut className="size-4" />
      {t("signOut")}
    </Button>
  );
}
