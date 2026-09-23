import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { FileText, MessageSquareText, Printer, Settings2 } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { canManageEnrollments, canPrintInterviewLog } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportsForEnrollment, summarize } from "@/lib/data/reports";
import { programLabel } from "@/lib/data/programs";
import { getProfileById, teamLabel } from "@/lib/data/org";
import { getAttachments } from "@/lib/files/data";
import { FileUploader } from "@/components/files/file-uploader";
import { AttachmentList } from "@/components/files/attachment-list";
import { currentWeek, enrollmentDates, formatDate, totalWeeks, weekRangeLabel } from "@/lib/weeks";
import { Container, PageHeader, SectionHeading } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { WeekGrid } from "@/components/reports/week-grid";
import type { Locale } from "@/types/db";

export default async function TraineeOverviewPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId } = await params;
  const { enrollment, trainee, mentor, team } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("reports");
  const tc = await getTranslations("common");
  const tp = await getTranslations("programs");

  const [reports, manager, documents] = await Promise.all([
    getReportsForEnrollment(enrollment.id),
    trainee.manager_id ? getProfileById(trainee.manager_id) : null,
    getAttachments("enrollment", enrollment.id),
  ]);
  const canManageDocs = canManageEnrollments(viewer) || enrollment.mentor_id === viewer.id || viewer.coMentorOfEnrollmentIds.includes(enrollment.id);
  const docKinds = [
    { value: "training_plan", label: tp("docTrainingPlan") },
    { value: "jd", label: tp("docJd") },
    { value: "other", label: tp("docOther") },
  ];
  const stats = summarize(reports);
  const total = totalWeeks(enrollment.program, enrollment);
  const cur = currentWeek(enrollment.program, enrollment);
  const { start, end } = enrollmentDates(enrollment.program, enrollment);
  const canPrint = await canPrintInterviewLog(viewer, enrollment);
  const types = enrollment.program.enabled_report_types;

  return (
    <Container>
      <PageHeader
        title={trainee.display_name}
        description={<span className="flex flex-wrap items-center gap-2">{[trainee.job_title, teamLabel(team, locale)].filter(Boolean).join(" · ")} <StatusBadge status={enrollment.status} /></span>}
        back={{ href: "/reports", label: t("hubTitle") }}
        actions={
          <>
            {canPrint && types.includes("interview") && (
              <Button variant="outline" nativeButton={false} render={<a href={`/reports/interview/${enrollment.id}/print`} target="_blank" rel="noreferrer" />}><Printer />{t("printLog")}</Button>
            )}
            {canManageEnrollments(viewer) && (
              <Button variant="outline" nativeButton={false} render={<Link href={`/admin/programs/${enrollment.program_id}`} />}><Settings2 />{tp("title")}</Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-3 pt-6 text-sm">
            <Row k={tp("program")} v={programLabel(enrollment.program, locale)} />
            <Row k={tp("period")} v={`${formatDate(start, locale)} – ${formatDate(end, locale)} · ${total}w`} />
            <Row k={t("statCurrentWeek")} v={`${cur} / ${total}`} />
            <Row k={tc("mentor")} v={mentor?.display_name ?? "—"} />
            <Row k={tc("manager")} v={manager?.display_name ?? "—"} />
            <Row k={tc("email")} v={trainee.email} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <SectionHeading
              title={tp("documents")}
              description={tp("documentsHint")}
              actions={canManageDocs ? <FileUploader ownerType="enrollment" ownerId={enrollment.id} kinds={docKinds} compact accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.md" /> : undefined}
            />
            <AttachmentList
              attachments={documents}
              canManage={canManageDocs}
              locale={locale}
              kindLabels={Object.fromEntries(docKinds.map((k) => [k.value, k.label]))}
              emptyText={tp("noDocuments")}
              className="mb-6"
            />
            <SectionHeading title={tp("jd")} />
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{enrollment.jd_text || <span className="text-muted-foreground">—</span>}</p>
            <SectionHeading title={tp("planSummary")} />
            {enrollment.training_plan.length ? (
              <ol className="space-y-1.5 text-sm">
                {enrollment.training_plan.map((p, i) => (
                  <li key={i} className={`flex gap-3 rounded-lg border px-3 py-2 ${cur >= p.week_from && cur <= p.week_to ? "border-brand-yellow bg-amber-50" : ""}`}>
                    <span className="w-16 shrink-0 font-semibold text-brand-navy">W{p.week_from}{p.week_to !== p.week_from ? `–${p.week_to}` : ""}</span>
                    <span className="flex-1">{p.topic}</span>
                    <span className="text-xs text-muted-foreground">{[p.method, p.owner].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>

      {types.includes("weekly") && (
        <section className="mt-8">
          <SectionHeading
            title={t("weekly")}
            description={`${t("statCompleted")} ${stats.weeklyCompleted} · ${t("statSubmitted")} ${stats.pendingReview} · ${t("statDrafts")} ${stats.weeklyDrafts}`}
            actions={<Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/weekly/${enrollment.id}`} />}><FileText />{t("weekGrid")}</Button>}
          />
          <WeekGrid enrollmentId={enrollment.id} totalWeeks={total} currentWeek={cur} reports={reports} weekLabel={(w) => weekRangeLabel(start, w)} writeLabel={t("write")} />
        </section>
      )}
      {types.includes("interview") && (
        <section className="mt-8">
          <SectionHeading
            title={t("interview")}
            description={`${stats.interviews} ${t("submittedCount")}`}
            actions={<Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/reports/interview/${enrollment.id}`} />}><MessageSquareText />{t("interviewList")}</Button>}
          />
        </section>
      )}
    </Container>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
