import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { getHubData } from "@/lib/data/hub";
import { groupByProgram } from "@/lib/data/program-groups";
import { getTeams, teamLabel } from "@/lib/data/org";
import { Container, PageHeader, SectionHeading } from "@/components/page-header";
import { EnrollmentCard, type EnrollmentCardData } from "@/components/reports/enrollment-card";
import { ProgramGroups } from "@/components/reports/program-groups";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/types/db";

export default async function ReportsHubPage({ searchParams }: { searchParams: Promise<{ program?: string; team?: string; q?: string; status?: string }> }) {
  const viewer = await requireViewer();
  const { program = "", team = "", q = "", status = "" } = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const [hub, teams] = await Promise.all([getHubData(viewer, locale), getTeams()]);
  const oversight = viewer.isAdmin || viewer.isPeopleOps || viewer.isGm;
  const filtering = !!(program || team || q || status);

  const labels = { weekly: t("weekly"), interview: t("interview"), mentor: tc("mentor"), pending: t("pendingShort"), week: tc("week"), print: t("printLog"), docs: t("documents") };
  const needle = q.trim().toLowerCase();
  const match = (c: EnrollmentCardData) =>
    (!program || c.programId === program) &&
    (!team || c.teamCode === team) &&
    (!status || (status === "active" ? c.status === "active" : c.status !== "active")) &&
    (!needle || c.traineeName.toLowerCase().includes(needle) || (c.mentorName ?? "").toLowerCase().includes(needle));

  // Personal sections (small → cards). Hidden while filtering so the result list is the only thing on screen.
  const personal = filtering ? [] : [
    { key: "mine", title: t("myTraining"), hint: undefined, items: hub.mine, print: false },
    { key: "mentees", title: t("myMentees"), hint: t("myMenteesHint"), items: hub.mentees, print: true },
    { key: "team", title: t("myTeam"), hint: t("myTeamHint"), items: hub.team, print: true },
  ].filter((s) => s.items.length);

  // Oversight: everything grouped by program (personal ones excluded unless filtering).
  const personalIds = new Set([...hub.mine, ...hub.mentees, ...hub.team].map((c) => c.enrollmentId));
  const pool = oversight ? hub.all.filter((c) => filtering || !personalIds.has(c.enrollmentId)) : [...hub.mine, ...hub.mentees, ...hub.team];
  const groups = groupByProgram(pool.filter(match), locale);
  const programs = groupByProgram(hub.all.length ? hub.all : pool, locale);
  const nothing = !personal.length && !groups.length;

  return (
    <Container size="xl">
      <PageHeader title={t("hubTitle")} description={oversight ? t("hubSubtitleOversight") : t("hubSubtitle")} />

      {(oversight || filtering) && (
        <form className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
          <select name="program" defaultValue={program} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="">{t("filterAllPrograms")}</option>
            {programs.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select name="team" defaultValue={team} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="">{t("filterAllTeams")}</option>
            {teams.filter((tm) => tm.code !== "gm").map((tm) => <option key={tm.code} value={tm.code}>{teamLabel(tm, locale)}</option>)}
          </select>
          <select name="status" defaultValue={status} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="">{tc("all")}</option>
            <option value="active">{ts("active")}</option>
            <option value="finished">{t("finished")}</option>
          </select>
          <Input name="q" defaultValue={q} placeholder={t("filterNamePlaceholder")} className="h-8 max-w-[220px]" />
          <Button type="submit" variant="outline" size="sm">{tc("search")}</Button>
          {filtering && <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reports" />}>{tc("all")}</Button>}
        </form>
      )}

      {personal.map((s) => (
        <section key={s.key} className="mb-10">
          <SectionHeading title={s.title} description={s.hint} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {s.items.map((d) => <EnrollmentCard key={d.enrollmentId} d={d} labels={labels} showPrint={s.print} />)}
          </div>
        </section>
      ))}

      {groups.length > 0 && (
        <section className="mb-10">
          {oversight && <SectionHeading title={filtering ? t("filterResults", { count: groups.reduce((a, g) => a + g.cards.length, 0) }) : t("allPrograms")} description={oversight && !filtering ? t("allProgramsHint") : undefined} />}
          <ProgramGroups groups={groups} labels={labels} />
        </section>
      )}

      {nothing && (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-muted-foreground">
          {filtering ? tc("none") : t("hubEmpty")}{" "}
          {!filtering && (viewer.isAdmin || viewer.isPeopleOps) && <Link href="/admin/programs" className="text-brand-blue hover:underline">{t("goPrograms")}</Link>}
        </div>
      )}
    </Container>
  );
}
