import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/viewer";
import { getAllProfiles, getTeams, teamLabel } from "@/lib/data/org";
import { formatDateTime } from "@/lib/weeks";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale } from "@/types/db";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; inactive?: string }> }) {
  await requireAdmin();
  const { q = "", inactive } = await searchParams;
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as Locale;

  const [profiles, teams] = await Promise.all([getAllProfiles(), getTeams()]);
  const teamMap = new Map(teams.map((tm) => [tm.code, tm]));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const needle = q.trim().toLowerCase();
  const rows = profiles
    .filter((p) => (inactive ? true : p.is_active))
    .filter((p) => !needle || [p.display_name, p.email, p.job_title ?? "", teamLabel(teamMap.get(p.team_code ?? ""), locale) ?? ""].some((s) => s.toLowerCase().includes(needle)));

  return (
    <>
      <PageHeader
        title={t("users")}
        description={t("usersSubtitle", { active: profiles.filter((p) => p.is_active).length, total: profiles.length })}
        actions={
          <Button nativeButton={false} render={<Link href="/admin/users/new" />}>
            <Plus />
            {t("newUser")}
          </Button>
        }
      />
      <form className="mb-4 flex flex-wrap items-center gap-3">
        <Input name="q" defaultValue={q} placeholder={tc("search")} className="max-w-xs" />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="inactive" value="1" defaultChecked={!!inactive} className="size-4" />
          {t("showInactive")}
        </label>
        <Button type="submit" variant="outline" size="sm">{tc("search")}</Button>
      </form>
      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("name")}</TableHead>
              <TableHead>{tc("jobTitle")}</TableHead>
              <TableHead>{tc("team")}</TableHead>
              <TableHead>{tc("manager")}</TableHead>
              <TableHead>{t("flags")}</TableHead>
              <TableHead>{t("lastLogin")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} className={!p.is_active ? "opacity-60" : undefined}>
                <TableCell>
                  <Link href={`/admin/users/${p.id}`} className="font-medium text-brand-blue hover:underline">{p.display_name}</Link>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </TableCell>
                <TableCell className="text-sm">{p.job_title ?? "—"}</TableCell>
                <TableCell className="text-sm">{teamLabel(teamMap.get(p.team_code ?? ""), locale) ?? "—"}</TableCell>
                <TableCell className="text-sm">{p.manager_id ? byId.get(p.manager_id)?.display_name ?? "—" : "—"}</TableCell>
                <TableCell className="space-x-1">
                  {p.is_admin && <Badge className="bg-brand-navy text-white">Admin</Badge>}
                  {p.is_people_ops && <Badge className="bg-tile-green text-white">People Ops</Badge>}
                  {p.is_gm && <Badge className="bg-brand-gold text-white">GM</Badge>}
                  {p.must_change_password && p.is_active && <Badge variant="outline" className="text-status-draft">{t("tempPw")}</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.last_login_at, locale)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={p.is_active ? "text-status-completed" : "text-muted-foreground"}>{p.is_active ? tc("active") : tc("inactive")}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{tc("none")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
