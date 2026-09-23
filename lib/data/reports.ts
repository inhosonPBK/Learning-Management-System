import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnrollment, getReportType, type EnrollmentWithProgram } from "@/lib/data/programs";
import type { Report, ReportType, ReportTypeCode } from "@/types/db";

export interface FullReportAccess {
  report: Report;
  enrollment: EnrollmentWithProgram;
  type: ReportType;
}

/** Report + enrollment(+program) + type — everything permissions.ts needs. */
export async function getReportAccess(reportId: string): Promise<FullReportAccess | null> {
  const { data: report } = await createAdminClient().from("reports").select("*").eq("id", reportId).maybeSingle<Report>();
  if (!report) return null;
  const [enrollment, type] = await Promise.all([getEnrollment(report.enrollment_id), getReportType(report.report_type)]);
  if (!enrollment || !type) return null;
  return { report, enrollment, type };
}

export async function getReportsForEnrollment(enrollmentId: string, typeCode?: ReportTypeCode): Promise<Report[]> {
  let q = createAdminClient().from("reports").select("*").eq("enrollment_id", enrollmentId);
  if (typeCode) q = q.eq("report_type", typeCode);
  const { data } = await q.order("period_index", { ascending: true, nullsFirst: false }).order("report_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as Report[];
}

export async function getWeeklyReport(enrollmentId: string, week: number): Promise<Report | null> {
  const { data } = await createAdminClient()
    .from("reports")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("report_type", "weekly")
    .eq("period_index", week)
    .maybeSingle<Report>();
  return data ?? null;
}

/** Reports across many enrollments (for dashboards / hub). */
export async function getReportsForEnrollments(enrollmentIds: string[]): Promise<Report[]> {
  if (!enrollmentIds.length) return [];
  const { data } = await createAdminClient().from("reports").select("*").in("enrollment_id", enrollmentIds).order("updated_at", { ascending: false });
  return (data ?? []) as Report[];
}

export interface EnrollmentStats {
  weeklySubmitted: number;
  weeklyCompleted: number;
  weeklyDrafts: number;
  pendingReview: number;
  interviews: number;
}

export function summarize(reports: Report[]): EnrollmentStats {
  const weekly = reports.filter((r) => r.report_type === "weekly");
  return {
    weeklySubmitted: weekly.filter((r) => r.status !== "draft").length,
    weeklyCompleted: weekly.filter((r) => r.status === "completed").length,
    weeklyDrafts: weekly.filter((r) => r.status === "draft").length,
    pendingReview: weekly.filter((r) => r.status === "submitted").length,
    interviews: reports.filter((r) => r.report_type === "interview" && r.status !== "draft").length,
  };
}
