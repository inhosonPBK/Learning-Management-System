import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/viewer";
import { canPrintInterviewLog } from "@/lib/auth/permissions";
import { loadEnrollmentForViewer } from "@/lib/data/enrollment-view";
import { getReportsForEnrollment } from "@/lib/data/reports";
import { parseInterview } from "@/lib/reports/schemas";
import { PrintButton } from "@/components/print/print-button";
import { PrintSheet } from "@/components/print/print-sheet";

const fmt = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getFullYear()).slice(2)}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
};

/** 청년친화강소기업 면담일지 — government-format 5-column table over submitted interview reports. Korean-only by design. */
export default async function InterviewLogPrintPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const viewer = await requireViewer();
  const { enrollmentId } = await params;
  const { enrollment, trainee, team } = await loadEnrollmentForViewer(viewer, enrollmentId);
  if (!(await canPrintInterviewLog(viewer, enrollment))) redirect(`/reports/interview/${enrollment.id}`);

  const reports = (await getReportsForEnrollment(enrollment.id, "interview")).filter((r) => r.status !== "draft");
  const name = trainee.name_ko ?? trainee.display_name;
  const dept = team?.name_ko ?? team?.name_en ?? "—";

  return (
    <PrintSheet
      wide
      title="청년친화강소기업 — 면담일지"
      meta={<>{name} · {dept}{trainee.job_title ? ` · ${trainee.job_title}` : ""} &nbsp;|&nbsp; 총 {reports.length}회 면담</>}
    >
      <table className="w-full border-collapse border-[1.5px] border-neutral-800 text-[12px]">
        <thead>
          <tr className="bg-[#EEF3F9] text-[11px] font-bold text-brand-navy">
            <th className="w-10 border border-neutral-500 px-2 py-2">연번</th>
            <th className="w-20 border border-neutral-500 px-2 py-2">성명</th>
            <th className="w-28 border border-neutral-500 px-2 py-2">근무부서</th>
            <th className="w-20 border border-neutral-500 px-2 py-2">면담일</th>
            <th className="border border-neutral-500 px-2 py-2">면담내용 및 청년 건의사항</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr><td colSpan={5} className="border border-neutral-500 px-2 py-8 text-center italic text-neutral-400">제출된 면담보고서가 없습니다.</td></tr>
          ) : (
            reports.map((r, i) => (
              <tr key={r.id} className="break-inside-avoid">
                <td className="border border-neutral-500 px-2 py-2 text-center align-top">{i + 1}</td>
                <td className="border border-neutral-500 px-2 py-2 text-center align-top">{name}</td>
                <td className="border border-neutral-500 px-2 py-2 text-center align-top">{dept}</td>
                <td className="border border-neutral-500 px-2 py-2 text-center align-top">{fmt(r.report_date)}</td>
                <td className="min-h-12 whitespace-pre-wrap border border-neutral-500 px-2.5 py-2 align-top leading-relaxed">{parseInterview(r.content).content || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-4 text-center text-[10px] text-neutral-400">
        출력일: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
      </div>
      <PrintButton label="🖨 출력 / PDF 저장" />
    </PrintSheet>
  );
}
