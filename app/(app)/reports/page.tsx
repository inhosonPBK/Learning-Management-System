import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { getHubData } from "@/lib/data/hub";
import { Container, PageHeader, SectionHeading } from "@/components/page-header";
import { EnrollmentCard, type EnrollmentCardData } from "@/components/reports/enrollment-card";
import type { Locale } from "@/types/db";

export default async function ReportsHubPage() {
  const viewer = await requireViewer();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const hub = await getHubData(viewer, locale);
  const oversight = viewer.isAdmin || viewer.isPeopleOps || viewer.isGm;

  const labels = { weekly: t("weekly"), interview: t("interview"), mentor: tc("mentor"), pending: t("pendingShort"), week: tc("week"), print: t("printLog"), docs: t("documents") };
  const shownAll = hub.all.filter((a) => ![...hub.mine, ...hub.mentees, ...hub.team].some((x) => x.enrollmentId === a.enrollmentId));
  const nothing = !hub.mine.length && !hub.mentees.length && !hub.team.length && !shownAll.length;

  return (
    <Container size="xl">
      <PageHeader title={t("hubTitle")} description={t("hubSubtitle")} />

      {hub.mine.length > 0 && (
        <section className="mb-10">
          <SectionHeading title={t("myTraining")} />
          <CardGrid items={hub.mine} showPrint={false} labels={labels} />
        </section>
      )}
      {hub.mentees.length > 0 && (
        <section className="mb-10">
          <SectionHeading title={t("myMentees")} description={t("myMenteesHint")} />
          <CardGrid items={hub.mentees} showPrint labels={labels} />
        </section>
      )}
      {hub.team.length > 0 && (
        <section className="mb-10">
          <SectionHeading title={t("myTeam")} description={t("myTeamHint")} />
          <CardGrid items={hub.team} showPrint labels={labels} />
        </section>
      )}
      {oversight && shownAll.length > 0 && (
        <section className="mb-10">
          <SectionHeading title={t("allActive")} description={t("allActiveHint")} />
          <CardGrid items={shownAll} showPrint labels={labels} />
        </section>
      )}
      {nothing && (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-muted-foreground">
          {t("hubEmpty")}{" "}
          {(viewer.isAdmin || viewer.isPeopleOps) && <Link href="/admin/programs" className="text-brand-blue hover:underline">{t("goPrograms")}</Link>}
        </div>
      )}
    </Container>
  );
}

function CardGrid({ items, showPrint, labels }: { items: EnrollmentCardData[]; showPrint: boolean; labels: React.ComponentProps<typeof EnrollmentCard>["labels"] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((d) => <EnrollmentCard key={d.enrollmentId} d={d} labels={labels} showPrint={showPrint} />)}
    </div>
  );
}
