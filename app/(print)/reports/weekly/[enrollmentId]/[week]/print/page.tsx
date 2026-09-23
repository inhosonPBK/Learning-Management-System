import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/viewer";
import { canViewReport } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportType } from "@/lib/data/programs";
import { getWeeklyReport } from "@/lib/data/reports";
import { getProfileById, teamLabel } from "@/lib/data/org";
import { enrollmentDates, formatDate, weekRangeLabel } from "@/lib/weeks";
import { PROGRESS, RATINGS, parseReview, parseWeekly } from "@/lib/reports/schemas";
import { PrintButton } from "@/components/print/print-button";
import { PrintPills, PrintSection, PrintSheet, PrintText } from "@/components/print/print-sheet";

export default async function WeeklyPrintPage({ params }: { params: Promise<{ enrollmentId: string; week: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId, week: weekStr } = await params;
  const week = Number(weekStr);
  const { enrollment, trainee, team } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const type = (await getReportType("weekly"))!;
  const report = await getWeeklyReport(enrollment.id, week);
  if (!report || !(await canViewReport(viewer, { report, enrollment, type }))) notFound();

  const content = parseWeekly(report.content);
  const review = parseReview(report.review);
  const reviewer = report.reviewer_id ? await getProfileById(report.reviewer_id) : null;
  const { start } = enrollmentDates(enrollment.program, enrollment);

  return (
    <PrintSheet
      title="Weekly Training Report"
      meta={
        <>
          {trainee.display_name} · {teamLabel(team, "en") ?? trainee.job_title} &nbsp;|&nbsp; Week {week} · {weekRangeLabel(start, week)}
          {content.topic ? ` · ${content.topic}` : ""} &nbsp;|&nbsp;
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-status-completed">{report.status === "completed" ? "✓ Completed" : report.status}</span>
        </>
      }
    >
      <PrintSection num="01" title="What I Learned This Week"><PrintText>{content.learned}</PrintText></PrintSection>
      <PrintSection num="02" title="How Was This Week">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Overall Rating</div>
        <PrintPills options={RATINGS} value={content.rating} />
        <PrintText>{content.feeling}</PrintText>
      </PrintSection>
      <PrintSection num="03" title="Questions & What I Want to Know More" color="orange"><PrintText>{content.questions}</PrintText></PrintSection>
      <PrintSection num="04" title="Mentor Feedback" color="gray">
        {reviewer && <div className="mb-3 text-xs italic text-neutral-400">Reviewed by {reviewer.display_name}</div>}
        <div className="overflow-hidden rounded-lg border border-neutral-300">
          {[["This week good at", review.good], ["Next week focus", review.next], ["Q&A summary", review.qa]].map(([label, value]) => (
            <div key={label} className="flex border-b border-neutral-300 last:border-b-0">
              <div className="w-36 shrink-0 border-r border-neutral-300 bg-neutral-100 px-3 py-2.5 text-[11px] font-bold text-neutral-600">{label}</div>
              <div className="flex-1 whitespace-pre-wrap px-3 py-2.5 text-[13px] leading-relaxed">{value || "—"}</div>
            </div>
          ))}
          <div className="flex border-t border-neutral-300">
            <div className="w-36 shrink-0 border-r border-neutral-300 bg-neutral-100 px-3 py-2.5 text-[11px] font-bold text-neutral-600">Progress status</div>
            <div className="flex-1 px-3 py-2.5"><PrintPills options={PROGRESS} value={review.progress} /></div>
          </div>
        </div>
      </PrintSection>
      <div className="mt-5 text-center text-[11px] text-neutral-400">
        {report.completed_at ? `Completed ${formatDate(report.completed_at, "en")}` : report.submitted_at ? `Submitted ${formatDate(report.submitted_at, "en")}` : ""}
      </div>
      <PrintButton />
    </PrintSheet>
  );
}
