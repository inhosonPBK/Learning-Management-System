import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { canEditReport, canViewReport } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportType, programLabel } from "@/lib/data/programs";
import { getReportAccess } from "@/lib/data/reports";
import { getProfileById } from "@/lib/data/org";
import { formatDate } from "@/lib/weeks";
import { Container, PageHeader } from "@/components/page-header";
import { InterviewForm } from "@/components/reports/interview-form";
import type { Locale } from "@/types/db";

export default async function InterviewDetailPage({ params }: { params: Promise<{ enrollmentId: string; reportId: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId, reportId } = await params;
  const { enrollment, trainee } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const access = await getReportAccess(reportId);
  if (!access || access.enrollment.id !== enrollment.id || access.type.code !== "interview") notFound();
  const type = (await getReportType("interview"))!;
  if (!(await canViewReport(viewer, { report: access.report, enrollment, type }))) notFound();

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");
  const author = await getProfileById(access.report.author_id);
  const canEdit = viewer.id === access.report.author_id && access.report.status !== "completed";
  const canDelete = canEdit || viewer.isAdmin;
  void canEditReport;

  return (
    <Container size="md">
      <PageHeader
        title={t("interviewTitleFor", { name: trainee.display_name })}
        description={`${programLabel(enrollment.program, locale)} · ${formatDate(access.report.report_date, locale)} · ${author?.display_name ?? ""}`}
        back={{ href: `/reports/interview/${enrollment.id}`, label: t("interviewList") }}
      />
      <InterviewForm enrollmentId={enrollment.id} initialReport={access.report} canEdit={canEdit} canDelete={canDelete} />
    </Container>
  );
}
