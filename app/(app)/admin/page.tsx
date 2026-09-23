import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Users, GraduationCap, Network, ScrollText } from "lucide-react";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminHome() {
  const viewer = await requireStaff();
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const admin = createAdminClient();

  const [users, active, programs, enrollments] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("programs").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const tiles = [
    { href: "/admin/programs", icon: GraduationCap, title: t("programs"), value: `${programs.count ?? 0}`, sub: t("activePrograms"), color: "bg-tile-blue" },
    { href: "/admin/programs", icon: Users, title: t("enrollments"), value: `${enrollments.count ?? 0}`, sub: t("activeEnrollments"), color: "bg-tile-green" },
    { href: "/admin/teams", icon: Network, title: t("teams"), value: "10", sub: t("teamsSub"), color: "bg-tile-amber" },
    ...(viewer.isAdmin
      ? [
          { href: "/admin/users", icon: Users, title: t("users"), value: `${active.count ?? 0} / ${users.count ?? 0}`, sub: t("activeUsers"), color: "bg-brand-navy" },
          { href: "/admin/audit", icon: ScrollText, title: t("audit"), value: "", sub: t("auditSub"), color: "bg-tile-orange" },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.href + tile.title} href={tile.href} className="group">
              <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                <div className={`${tile.color} flex items-center justify-between px-5 py-4 text-white`}>
                  <span className="text-base font-semibold">{tile.title}</span>
                  <Icon className="size-5 opacity-80" />
                </div>
                <CardContent className="pt-4">
                  {tile.value && <div className="text-2xl font-bold text-brand-navy">{tile.value}</div>}
                  <div className="text-sm text-muted-foreground">{tile.sub}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">{locale === "ko" ? "관리 기능은 Admin · People Operations에게만 표시됩니다." : "Admin tools are visible to Admin and People Operations only."}</p>
    </>
  );
}
