"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type ShellUser } from "./nav-config";

/**
 * Secondary navigation links. `variant="bar"` renders the horizontal dark bar (desktop),
 * `variant="list"` renders a vertical list for the mobile sheet.
 */
export function NavLinks({ user, variant = "bar", onNavigate }: { user: ShellUser; variant?: "bar" | "list"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const items = NAV_ITEMS.filter((i) => !i.staffOnly || user.isStaff);

  if (variant === "list") {
    return (
      <nav className="flex flex-col gap-1 p-2">
        {items.map((item) => {
          const active = item.match.some((m) => pathname.startsWith(m));
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                active ? "bg-brand-navy text-white" : "text-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex h-11 items-stretch gap-1">
      {items.map((item) => {
        const active = item.match.some((m) => pathname.startsWith(m));
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "relative flex items-center gap-2 px-3 text-sm font-medium text-white/80 transition-colors hover:text-white",
              active && "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-t after:bg-brand-yellow",
            )}
          >
            <Icon className="size-4 opacity-80" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
