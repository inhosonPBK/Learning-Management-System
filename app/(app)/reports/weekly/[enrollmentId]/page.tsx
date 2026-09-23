import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportsForEnrollment, summarize } from "@/lib/data/reports";
import { programLabel } from "@/lib/data/programs";
import { teamLabel } from "@/lib/data/org";
import { currentWeek, enrollmentDates, totalWeeks, weekRangeLabel } from "@/lib/weeks";
import { Container, PageHeader } from "@/components/page-header";
import { WeekGrid } from "@/components/reports/week-grid";
import { StatusBadge } from "@/components/status-badge";
import type { Locale } from "@/types/db";

export default async function WeeklyGridPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId } = await params;
  const { enrollment, trainee, mentor, team } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");

  const reports = await getReportsForEnrollment(enrollment.id, "weekly");
  const stats = summarize(reports);
  const total = totalWeeks(enrollment.program, enrollment);
  const cur = currentWeek(enrollment.program, enrollment);
  const { start } = enrollmentDates(enrollment.program, enrollment);
  const isMe = trainee.id === viewer.id;

  return (
    <Container>
      <PageHeader
        title={isMe ? t("myWeeklyTitle") : t("weeklyTitleFor", { name: trainee.display_name })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {programLabel(enrollment.program, locale)} · {teamLabel(team, locale) ?? trainee.job_title}
            {mentor && <span>· {tc("mentor")}: {mentor.display_name}</span>}
            <StatusBadge status={enrollment.status} />
          </span>
        }
        back={{ href: isMe ? "/dashboard" : `/trainees/${enrollment.id}`, label: isMe ? tc("back") : trainee.display_name }}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t("statCurrentWeek"), `${cur} / ${total}`, "text-brand-navy"],
          [t("statCompleted"), stats.weeklyCompleted, "text-status-completed"],
          [t("statSubmitted"), stats.pendingReview, "text-status-submitted"],
          [t("statDrafts"), stats.weeklyDrafts, "text-status-draft"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border bg-white px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <WeekGrid enrollmentId={enrollment.id} totalWeeks={total} currentWeek={cur} reports={reports} weekLabel={(w) => weekRangeLabel(start, w)} writeLabel={t("write")} />
    </Container>
  );
}
