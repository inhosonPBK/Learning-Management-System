import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { canCreateReport, canEditReport, canReviewReport, canViewReport } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportType, programLabel } from "@/lib/data/programs";
import { getWeeklyReport } from "@/lib/data/reports";
import { getProfileById } from "@/lib/data/org";
import { enrollmentDates, totalWeeks, weekRangeLabel } from "@/lib/weeks";
import { Container, PageHeader } from "@/components/page-header";
import { WeeklyForm } from "@/components/reports/weekly-form";
import type { Locale } from "@/types/db";

export default async function WeeklyEditorPage({ params }: { params: Promise<{ enrollmentId: string; week: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId, week: weekStr } = await params;
  const week = Number(weekStr);
  const { enrollment, trainee } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const total = totalWeeks(enrollment.program, enrollment);
  if (!Number.isInteger(week) || week < 1 || week > total) notFound();

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");
  const type = (await getReportType("weekly"))!;
  const report = await getWeeklyReport(enrollment.id, week);

  // Visibility: a draft is only visible to its author (or admin); no report yet → only someone who could create it, or anyone who can view the enrollment (they see an empty state).
  if (report && !(await canViewReport(viewer, { report, enrollment, type }))) notFound();

  const isTrainee = viewer.id === enrollment.trainee_id;
  const canEdit = report ? canEditReport(viewer, report) : await canCreateReport(viewer, enrollment, enrollment.program, type);
  const canReview = report ? canReviewReport(viewer, { report, enrollment, type }) : false;
  const reviewer = report?.reviewer_id ? await getProfileById(report.reviewer_id) : null;
  const { start } = enrollmentDates(enrollment.program, enrollment);

  return (
    <Container size="md">
      <PageHeader
        title={isTrainee ? t("myWeeklyTitle") : t("weeklyTitleFor", { name: trainee.display_name })}
        description={programLabel(enrollment.program, locale)}
        back={{ href: `/reports/weekly/${enrollment.id}`, label: t("weekGrid") }}
        className="mb-4"
      />
      <WeeklyForm
        key={`${enrollment.id}-${week}-${report?.id ?? "new"}`}
        enrollmentId={enrollment.id}
        week={week}
        totalWeeks={total}
        weekLabel={weekRangeLabel(start, week)}
        initialReport={report}
        canEdit={canEdit}
        canReview={canReview}
        isTrainee={isTrainee}
        reviewerName={reviewer?.display_name ?? null}
      />
    </Container>
  );
}
