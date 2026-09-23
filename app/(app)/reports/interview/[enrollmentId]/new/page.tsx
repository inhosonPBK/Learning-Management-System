import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { canCreateReport } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportType, programLabel } from "@/lib/data/programs";
import { Container, PageHeader } from "@/components/page-header";
import { InterviewForm } from "@/components/reports/interview-form";
import type { Locale } from "@/types/db";

export default async function NewInterviewPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId } = await params;
  const { enrollment, trainee } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const type = (await getReportType("interview"))!;
  if (!(await canCreateReport(viewer, enrollment, enrollment.program, type))) redirect(`/reports/interview/${enrollment.id}`);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");

  return (
    <Container size="md">
      <PageHeader title={t("newInterview")} description={`${trainee.display_name} · ${programLabel(enrollment.program, locale)}`} back={{ href: `/reports/interview/${enrollment.id}`, label: t("interviewList") }} />
      <InterviewForm enrollmentId={enrollment.id} initialReport={null} canEdit canDelete={false} />
    </Container>
  );
}
