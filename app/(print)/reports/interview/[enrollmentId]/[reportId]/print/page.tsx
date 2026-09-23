import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth/viewer";
import { canViewReport } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportType } from "@/lib/data/programs";
import { getReportAccess } from "@/lib/data/reports";
import { getProfileById } from "@/lib/data/org";
import { formatDate } from "@/lib/weeks";
import { parseInterview } from "@/lib/reports/schemas";
import { PrintButton } from "@/components/print/print-button";
import { PrintSheet, PrintText } from "@/components/print/print-sheet";

/** Single interview report sheet (Korean labels — same audience as the government log). */
export default async function InterviewPrintPage({ params }: { params: Promise<{ enrollmentId: string; reportId: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId, reportId } = await params;
  const { enrollment, trainee, team } = await loadEnrollmentForViewer(viewer, enrollmentId);
  const access = await getReportAccess(reportId);
  if (!access || access.enrollment.id !== enrollment.id || access.type.code !== "interview") notFound();
  const type = (await getReportType("interview"))!;
  if (!(await canViewReport(viewer, { report: access.report, enrollment, type }))) notFound();
  const author = await getProfileById(access.report.author_id);

  const rows: [string, string][] = [
    ["피교육자", trainee.name_ko ?? trainee.display_name],
    ["근무부서", `${team?.name_ko ?? team?.name_en ?? "—"}${trainee.job_title ? ` · ${trainee.job_title}` : ""}`],
    ["면담일", formatDate(access.report.report_date, "ko")],
    ["작성자", author?.display_name ?? "—"],
  ];

  return (
    <PrintSheet title="면담보고서 (Interview Report)">
      <table className="mb-5 w-full overflow-hidden rounded-lg border border-neutral-200 text-[13px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-neutral-200 last:border-b-0">
              <td className="w-36 bg-[#F4F7FB] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-neutral-600">{k}</td>
              <td className="px-3.5 py-2.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="rounded-lg border border-neutral-200 p-5">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-600">면담내용 및 청년 건의사항</div>
        <PrintText>{parseInterview(access.report.content).content}</PrintText>
      </section>
      {access.report.submitted_at && <div className="mt-5 text-center text-[11px] text-neutral-400">제출 {formatDate(access.report.submitted_at, "ko")}</div>}
      <PrintButton label="🖨 출력 / PDF 저장" />
    </PrintSheet>
  );
}
