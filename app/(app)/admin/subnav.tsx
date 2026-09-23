"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AdminSubnav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const items = [
    { href: "/admin", label: t("admin"), exact: true },
    { href: "/admin/programs", label: t("adminPrograms") },
    { href: "/admin/teams", label: t("adminTeams") },
    ...(isAdmin ? [{ href: "/admin/users", label: t("adminUsers") }, { href: "/admin/audit", label: t("adminAudit") }] : []),
  ];
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b">
      {items.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              active ? "border-brand-yellow text-brand-navy" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
