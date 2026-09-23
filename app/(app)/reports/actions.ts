"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/viewer";
import {
  canCreateReport,
  canEditReport,
  canRecallReport,
  canReopenReport,
  canReviewReport,
} from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { getEnrollment, getReportType } from "@/lib/data/programs";
import { getReportAccess, getWeeklyReport } from "@/lib/data/reports";
import { interviewContentV1, weeklyContentV1, weeklyReviewV1 } from "@/lib/reports/schemas";
import type { Report } from "@/types/db";

type Result<T = Report> = { data: T } | { error: string };

function revalidateWeekly(enrollmentId: string, week?: number) {
  revalidatePath(`/reports/weekly/${enrollmentId}`);
  if (week) revalidatePath(`/reports/weekly/${enrollmentId}/${week}`);
  revalidatePath(`/trainees/${enrollmentId}`);
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}
function revalidateInterview(enrollmentId: string) {
  revalidatePath(`/reports/interview/${enrollmentId}`);
  revalidatePath(`/trainees/${enrollmentId}`);
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

// ── Weekly (trainee-authored) ───────────────────────────────────────────────

interface WeeklyPayload {
  enrollmentId: string;
  week: number;
  content: unknown;
}

async function upsertWeekly(payload: WeeklyPayload, status: "draft" | "submitted"): Promise<Result> {
  const viewer = await requireViewer();
  const parsed = weeklyContentV1.safeParse(payload.content);
  if (!parsed.success) return { error: "Invalid content" };
  const week = Math.trunc(payload.week);
  if (!Number.isFinite(week) || week < 1) return { error: "Invalid week" };

  const [enrollment, type] = await Promise.all([getEnrollment(payload.enrollmentId), getReportType("weekly")]);
  if (!enrollment || !type) return { error: "Enrollment not found" };
  const admin = createAdminClient();
  const existing = await getWeeklyReport(enrollment.id, week);

  if (existing) {
    if (!canEditReport(viewer, existing)) {
      return { error: existing.status === "completed" ? "locked" : "not-draft" };
    }
    const { data, error } = await admin
      .from("reports")
      .update({
        content: parsed.data,
        schema_version: 1,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      })
      .eq("id", existing.id)
      .select("*")
      .single<Report>();
    if (error) return { error: error.message };
    if (status === "submitted") await logAudit(viewer.id, "report.submit", "report", data.id, { type: "weekly", week });
    revalidateWeekly(enrollment.id, week);
    return { data };
  }

  if (!(await canCreateReport(viewer, enrollment, enrollment.program, type))) return { error: "Not authorized" };
  const { data, error } = await admin
    .from("reports")
    .insert({
      enrollment_id: enrollment.id,
      trainee_id: enrollment.trainee_id,
      report_type: "weekly",
      author_id: viewer.id,
      period_index: week,
      content: parsed.data,
      schema_version: 1,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    })
    .select("*")
    .single<Report>();
  if (error) return { error: error.message };
  if (status === "submitted") await logAudit(viewer.id, "report.submit", "report", data.id, { type: "weekly", week });
  revalidateWeekly(enrollment.id, week);
  return { data };
}

export async function saveWeeklyDraft(payload: WeeklyPayload) {
  return upsertWeekly(payload, "draft");
}
export async function submitWeekly(payload: WeeklyPayload) {
  return upsertWeekly(payload, "submitted");
}

export async function recallReport(reportId: string): Promise<Result> {
  const viewer = await requireViewer();
  const access = await getReportAccess(reportId);
  if (!access) return { error: "Not found" };
  if (!canRecallReport(viewer, access.report)) return { error: access.report.status === "completed" ? "locked" : "Not authorized" };
  const { data, error } = await createAdminClient()
    .from("reports")
    .update({ status: "draft", submitted_at: null })
    .eq("id", reportId)
    .select("*")
    .single<Report>();
  if (error) return { error: error.message };
  await logAudit(viewer.id, "report.recall", "report", reportId, { type: access.type.code });
  if (access.type.code === "weekly") revalidateWeekly(access.enrollment.id, access.report.period_index ?? undefined);
  else revalidateInterview(access.enrollment.id);
  return { data };
}

// ── Review (mentor) ─────────────────────────────────────────────────────────

export async function saveReview(reportId: string, review: unknown): Promise<Result> {
  const viewer = await requireViewer();
  const access = await getReportAccess(reportId);
  if (!access) return { error: "Not found" };
  if (!canReviewReport(viewer, access)) return { error: "Not authorized" };
  const parsed = weeklyReviewV1.safeParse(review);
  if (!parsed.success) return { error: "Invalid review" };
  const { data, error } = await createAdminClient()
    .from("reports")
    .update({ review: parsed.data, reviewer_id: viewer.id })
    .eq("id", reportId)
    .select("*")
    .single<Report>();
  if (error) return { error: error.message };
  return { data };
}

export async function completeReview(reportId: string, review: unknown): Promise<Result> {
  const viewer = await requireViewer();
  const access = await getReportAccess(reportId);
  if (!access) return { error: "Not found" };
  if (!canReviewReport(viewer, access)) return { error: "Not authorized" };
  const parsed = weeklyReviewV1.safeParse(review);
  if (!parsed.success) return { error: "Invalid review" };
  if (!parsed.data.progress) return { error: "progress-required" };
  const { data, error } = await createAdminClient()
    .from("reports")
    .update({ review: parsed.data, reviewer_id: viewer.id, status: "completed", completed_at: new Date().toISOString() })
    .eq("id", reportId)
    .select("*")
    .single<Report>();
  if (error) return { error: error.message };
  await logAudit(viewer.id, "report.complete", "report", reportId, { type: access.type.code });
  revalidateWeekly(access.enrollment.id, access.report.period_index ?? undefined);
  return { data };
}

/** Admin / People Ops: completed → submitted so the mentor can revise. */
export async function reopenReport(reportId: string): Promise<Result> {
  const viewer = await requireViewer();
  if (!canReopenReport(viewer)) return { error: "Not authorized" };
  const access = await getReportAccess(reportId);
  if (!access || access.report.status !== "completed") return { error: "Not found" };
  const { data, error } = await createAdminClient()
    .from("reports")
    .update({ status: "submitted", completed_at: null })
    .eq("id", reportId)
    .select("*")
    .single<Report>();
  if (error) return { error: error.message };
  await logAudit(viewer.id, "report.reopen", "report", reportId);
  revalidateWeekly(access.enrollment.id, access.report.period_index ?? undefined);
  return { data };
}

// ── Interview (supervisor-authored) ─────────────────────────────────────────

interface InterviewPayload {
  reportId?: string;
  enrollmentId: string;
  reportDate: string;
  content: unknown;
}

async function upsertInterview(payload: InterviewPayload, status: "draft" | "submitted"): Promise<Result> {
  const viewer = await requireViewer();
  const parsed = interviewContentV1.safeParse(payload.content);
  if (!parsed.success) return { error: "Invalid content" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.reportDate)) return { error: "date-required" };
  const admin = createAdminClient();

  if (payload.reportId) {
    const access = await getReportAccess(payload.reportId);
    if (!access) return { error: "Not found" };
    if (!canEditReport(viewer, access.report)) return { error: "not-draft" };
    const { data, error } = await admin
      .from("reports")
      .update({ content: parsed.data, report_date: payload.reportDate, status, submitted_at: status === "submitted" ? new Date().toISOString() : null })
      .eq("id", payload.reportId)
      .select("*")
      .single<Report>();
    if (error) return { error: error.message };
    if (status === "submitted") await logAudit(viewer.id, "report.submit", "report", data.id, { type: "interview" });
    revalidateInterview(access.enrollment.id);
    return { data };
  }

  const [enrollment, type] = await Promise.all([getEnrollment(payload.enrollmentId), getReportType("interview")]);
  if (!enrollment || !type) return { error: "Enrollment not found" };
  if (!(await canCreateReport(viewer, enrollment, enrollment.program, type))) return { error: "Not authorized" };
  const { data, error } = await admin
    .from("reports")
    .insert({
      enrollment_id: enrollment.id,
      trainee_id: enrollment.trainee_id,
      report_type: "interview",
      author_id: viewer.id,
      report_date: payload.reportDate,
      content: parsed.data,
      schema_version: 1,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    })
    .select("*")
    .single<Report>();
  if (error) return { error: error.message };
  if (status === "submitted") await logAudit(viewer.id, "report.submit", "report", data.id, { type: "interview" });
  revalidateInterview(enrollment.id);
  return { data };
}

export async function saveInterviewDraft(payload: InterviewPayload) {
  return upsertInterview(payload, "draft");
}
export async function submitInterview(payload: InterviewPayload) {
  return upsertInterview(payload, "submitted");
}

/** Author may delete their own non-completed report; admin may delete any. */
export async function deleteReport(reportId: string): Promise<Result<{ enrollmentId: string }>> {
  const viewer = await requireViewer();
  const access = await getReportAccess(reportId);
  if (!access) return { error: "Not found" };
  const own = access.report.author_id === viewer.id && access.report.status !== "completed";
  if (!own && !viewer.isAdmin) return { error: "Not authorized" };
  const { error } = await createAdminClient().from("reports").delete().eq("id", reportId);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "report.delete", "report", reportId, { type: access.type.code, status: access.report.status });
  if (access.type.code === "weekly") revalidateWeekly(access.enrollment.id, access.report.period_index ?? undefined);
  else revalidateInterview(access.enrollment.id);
  return { data: { enrollmentId: access.enrollment.id } };
}
