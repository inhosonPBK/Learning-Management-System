import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus, Printer } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { canCreateReport, canPrintInterviewLog, canViewReport } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportType, programLabel } from "@/lib/data/programs";
import { getReportsForEnrollment } from "@/lib/data/reports";
import { getProfilesMap, teamLabel } from "@/lib/data/org";
import { formatDate } from "@/lib/weeks";
import { parseInterview } from "@/lib/reports/schemas";
import { Container, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import type { Locale } from "@/types/db";

export default async function InterviewListPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId } = await params;
  const { enrollment, trainee, mentor, team } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const type = (await getReportType("interview"))!;

  const all = await getReportsForEnrollment(enrollment.id, "interview");
  const visible = (await Promise.all(all.map(async (r) => ((await canViewReport(viewer, { report: r, enrollment, type })) ? r : null)))).filter((r): r is NonNullable<typeof r> => !!r);
  const authors = await getProfilesMap(visible.map((r) => r.author_id));
  const canCreate = await canCreateReport(viewer, enrollment, enrollment.program, type);
  const canPrint = await canPrintInterviewLog(viewer, enrollment);
  const isTrainee = viewer.id === enrollment.trainee_id;

  return (
    <Container>
      <PageHeader
        title={t("interviewTitleFor", { name: trainee.display_name })}
        description={<span>{programLabel(enrollment.program, locale)} · {teamLabel(team, locale) ?? trainee.job_title}{mentor ? ` · ${tc("mentor")}: ${mentor.display_name}` : ""}</span>}
        back={{ href: isTrainee ? "/dashboard" : `/trainees/${enrollment.id}`, label: isTrainee ? tc("back") : trainee.display_name }}
        actions={
          <>
            {canPrint && visible.some((r) => r.status === "submitted") && (
              <Button variant="outline" nativeButton={false} render={<a href={`/reports/interview/${enrollment.id}/print`} target="_blank" rel="noreferrer" />}>
                <Printer />{t("printLog")}
              </Button>
            )}
            {canCreate && enrollment.status === "active" && (
              <Button nativeButton={false} render={<Link href={`/reports/interview/${enrollment.id}/new`} />}>
                <Plus />{t("newInterview")}
              </Button>
            )}
          </>
        }
      />

      {!visible.length ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-muted-foreground">
          {isTrainee && !type.trainee_visible ? t("interviewHiddenFromTrainee") : t("noInterviews")}
        </div>
      ) : (
        <ol className="space-y-2">
          {visible.map((r, i) => (
            <li key={r.id}>
              <Link href={`/reports/interview/${enrollment.id}/${r.id}`} className="flex items-center gap-4 rounded-xl border border-l-4 border-l-tile-green bg-white px-5 py-3.5 transition-shadow hover:shadow-md">
                <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <span className="w-28 shrink-0 text-sm font-semibold text-brand-navy">{formatDate(r.report_date, locale)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{parseInterview(r.content).content || "—"}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">{authors.get(r.author_id)?.display_name}</span>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Container>
  );
}
