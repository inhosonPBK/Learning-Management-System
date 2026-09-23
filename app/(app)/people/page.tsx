import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { getAllProfiles, getTeams, teamLabel } from "@/lib/data/org";
import { Container, PageHeader } from "@/components/page-header";
import { OrgChart, type EntityNode, type PersonNode, type TeamNode } from "@/components/people/org-chart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Locale, Profile, Team } from "@/types/db";

const ENTITY_ORDER: EntityNode["code"][] = ["PBK", "PK", "SHARED"];

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; team?: string }> }) {
  const viewer = await requireViewer();
  const { q = "", team: teamFilter = "" } = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("people");
  const tc = await getTranslations("common");
  const [profiles, teams] = await Promise.all([getAllProfiles(), getTeams()]);

  const needle = q.trim().toLowerCase();
  const matches = (p: Profile) => !needle || [p.display_name, p.name_ko ?? "", p.email, p.job_title ?? ""].some((s) => s.toLowerCase().includes(needle));
  const filtering = !!needle || !!teamFilter;

  const toNode = (p: Profile, children: PersonNode[] = []): PersonNode => ({
    id: p.id,
    name: p.display_name,
    nameKo: p.name_ko,
    title: p.job_title,
    email: p.email,
    isActive: p.is_active,
    isIntern: p.employee_type === "Intern",
    isYou: p.id === viewer.id,
    children,
  });

  // Subtree under `managerId` restricted to one team; pruned to matches when filtering.
  const byManager = new Map<string, Profile[]>();
  for (const p of profiles) if (p.manager_id) (byManager.get(p.manager_id) ?? byManager.set(p.manager_id, []).get(p.manager_id)!).push(p);
  const subtree = (managerId: string, teamCode: string): PersonNode[] =>
    (byManager.get(managerId) ?? [])
      .filter((p) => p.team_code === teamCode)
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.display_name.localeCompare(b.display_name))
      .map((p) => {
        const children = subtree(p.id, teamCode);
        // when searching, keep a person if they match or any descendant matched
        return !needle || matches(p) || children.length ? toNode(p, children) : null;
      })
      .filter((n): n is PersonNode => !!n);

  const gmProfile = profiles.find((p) => p.is_gm) ?? profiles.find((p) => !p.manager_id && p.is_active) ?? null;

  const buildTeam = (tm: Team): TeamNode | null => {
    if (teamFilter && tm.code !== teamFilter) return null;
    const lead = tm.lead_id ? profiles.find((p) => p.id === tm.lead_id) ?? null : null;
    const tree = lead ? subtree(lead.id, tm.code) : [];
    const count = profiles.filter((p) => p.team_code === tm.code && p.is_active).length;
    if (needle && !tree.length && !(lead && matches(lead))) return null;
    return {
      code: tm.code,
      name: teamLabel(tm, locale) ?? tm.name_en,
      altName: (locale === "ko" ? tm.name_en : tm.name_ko) ?? "",
      lead: lead ? toNode(lead) : null,
      count,
      tree,
    };
  };

  const entities: EntityNode[] = ENTITY_ORDER.map((code) => ({
    code,
    label: code,
    description: t(`entity.${code}`),
    count: profiles.filter((p) => p.entity === code && p.is_active && !p.is_gm).length,
    teams: teams.filter((tm) => tm.is_active && tm.code !== "gm" && tm.entity === code).map(buildTeam).filter((x): x is TeamNode => !!x),
  })).filter((e) => !filtering || e.teams.length);

  const showGm = !!gmProfile && !filtering;

  return (
    <Container size="xl">
      <PageHeader title={t("title")} description={t("subtitle", { count: profiles.filter((p) => p.is_active).length })} />

      <form className="mb-6 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="max-w-xs" />
        <select name="team" defaultValue={teamFilter} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
          <option value="">{tc("all")}</option>
          {teams.filter((tm) => tm.code !== "gm").map((tm) => <option key={tm.code} value={tm.code}>{teamLabel(tm, locale)}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">{tc("search")}</Button>
        {filtering && <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/people" />}>{t("clear")}</Button>}
      </form>

      {!entities.length ? (
        <p className="text-sm text-muted-foreground">{tc("none")}</p>
      ) : (
        <OrgChart
          key={`${q}|${teamFilter}`}
          gm={showGm && gmProfile ? toNode(gmProfile) : null}
          entities={entities}
          defaultExpanded={filtering}
          labels={{
            lead: t("lead"),
            you: t("you"),
            inactive: tc("inactive"),
            expandAll: t("expandAll"),
            collapseAll: t("collapseAll"),
            members: t("members"),
            reports: t.raw("reports"), // template with {n}; interpolated client-side per node
          }}
        />
      )}
    </Container>
  );
}