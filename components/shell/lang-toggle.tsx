"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/lib/i18n/actions";

const OPTIONS = [
  { value: "ko", label: "한국어", short: "KO" },
  { value: "en", label: "English", short: "EN" },
] as const;

export function LangToggle() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-1.5 font-semibold" aria-label={t("language")} disabled={pending} />}
      >
        <Globe className="size-4" />
        {OPTIONS.find((o) => o.value === locale)?.short ?? "KO"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() =>
              start(async () => {
                await setLocale(o.value);
                router.refresh();
              })
            }
          >
            <span className="flex-1">{o.label}</span>
            {o.value === locale && <Check className="size-4 text-brand-blue" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
