import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { getAllProfiles, getTeams, teamLabel } from "@/lib/data/org";
import { Container, PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";
import type { Locale, Profile } from "@/types/db";

const TILE = ["bg-tile-blue", "bg-tile-green", "bg-tile-orange", "bg-tile-amber", "bg-brand-navy", "bg-brand-blue-dark"];

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; team?: string }> }) {
  const viewer = await requireViewer();
  const { q = "", team = "" } = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("people");
  const tc = await getTranslations("common");
  const [profiles, teams] = await Promise.all([getAllProfiles(), getTeams()]);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const needle = q.trim().toLowerCase();

  const matches = (p: Profile) => !needle || [p.display_name, p.name_ko ?? "", p.email, p.job_title ?? ""].some((s) => s.toLowerCase().includes(needle));

  const groups = teams
    .filter((tm) => tm.is_active && (!team || tm.code === team))
    .map((tm) => ({
      team: tm,
      members: profiles
        .filter((p) => p.team_code === tm.code && matches(p))
        .sort((a, b) => Number(b.id === tm.lead_id) - Number(a.id === tm.lead_id) || Number(b.is_active) - Number(a.is_active) || a.display_name.localeCompare(b.display_name)),
    }))
    .filter((g) => g.members.length);

  return (
    <Container size="xl">
      <PageHeader title={t("title")} description={t("subtitle", { count: profiles.filter((p) => p.is_active).length })} />

      <form className="mb-6 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="max-w-xs" />
        <select name="team" defaultValue={team} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
          <option value="">{tc("all")}</option>
          {teams.map((tm) => <option key={tm.code} value={tm.code}>{teamLabel(tm, locale)}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">{tc("search")}</Button>
        {(q || team) && <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/people" />}>{t("clear")}</Button>}
      </form>

      {!groups.length && <p className="text-sm text-muted-foreground">{tc("none")}</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g, i) => (
          <section key={g.team.code} className="overflow-hidden rounded-xl border bg-white">
            <div className={cn("flex items-center justify-between px-5 py-3 text-white", TILE[i % TILE.length])}>
              <div>
                <div className="text-base font-semibold">{teamLabel(g.team, locale)}</div>
                <div className="text-xs text-white/75">{locale === "ko" ? g.team.name_en : g.team.name_ko ?? ""}{g.team.entity ? ` · ${g.team.entity}` : ""}</div>
              </div>
              <span className="text-sm font-bold">{g.members.filter((m) => m.is_active).length}</span>
            </div>
            <ul className="divide-y">
              {g.members.map((p) => {
                const isLead = p.id === g.team.lead_id;
                const manager = p.manager_id ? byId.get(p.manager_id) : null;
                return (
                  <li key={p.id} className={cn("flex items-center gap-3 px-4 py-2.5", !p.is_active && "opacity-50")}>
                    <Avatar className="size-8">
                      <AvatarFallback className={cn("text-[10px] font-bold", isLead ? "bg-brand-yellow text-brand-navy-deep" : "bg-brand-navy text-white")}>{initialsOf(p.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="truncate font-medium">{p.display_name}</span>
                        {p.name_ko && <span className="text-xs text-muted-foreground">{p.name_ko}</span>}
                        {isLead && <Badge className="bg-brand-yellow text-[10px] text-brand-navy-deep">{t("lead")}</Badge>}
                        {p.employee_type === "Intern" && <Badge variant="outline" className="text-[10px] text-tile-green">Intern</Badge>}
                        {!p.is_active && <Badge variant="outline" className="text-[10px]">{tc("inactive")}</Badge>}
                        {p.id === viewer.id && <Badge variant="outline" className="text-[10px] text-brand-blue">{t("you")}</Badge>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.job_title}{manager && !isLead ? ` · ${tc("manager")}: ${manager.display_name}` : ""}
                      </div>
                    </div>
                    <a href={`mailto:${p.email}`} className="text-muted-foreground hover:text-brand-blue" aria-label={p.email} title={p.email}><Mail className="size-4" /></a>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}
