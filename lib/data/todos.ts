import "server-only";
import { cache } from "react";
import type { Viewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnrollmentsByIds } from "@/lib/data/programs";
import { getProfilesMap } from "@/lib/data/org";
import { currentWeek } from "@/lib/weeks";
import type { Report } from "@/types/db";

export type TodoKind = "review" | "draft" | "weekly_due" | "no_mentor";

export interface Todo {
  key: string;
  kind: TodoKind;
  href: string;
  /** person the item is about (trainee name) */
  who: string | null;
  /** week number when relevant */
  week: number | null;
  reportType?: "weekly" | "interview";
}

/** Action items for the current viewer — feeds the header bell and the dashboard "action required" list. */
export const getTodos = cache(async (viewer: Viewer): Promise<Todo[]> => {
  const admin = createAdminClient();
  const menteeIds = [...new Set([...viewer.mentorOfEnrollmentIds, ...viewer.coMentorOfEnrollmentIds])];
  const staff = viewer.isAdmin || viewer.isPeopleOps;

  const [pending, drafts, mine, unassigned] = await Promise.all([
    menteeIds.length
      ? admin.from("reports").select("*").in("enrollment_id", menteeIds).eq("report_type", "weekly").eq("status", "submitted").order("submitted_at")
      : Promise.resolve({ data: [] as Report[] }),
    admin.from("reports").select("*").eq("author_id", viewer.id).eq("status", "draft").order("updated_at", { ascending: false }),
    getEnrollmentsByIds(viewer.myEnrollmentIds),
    staff ? admin.from("enrollments").select("id, trainee_id").eq("status", "active").is("mentor_id", null) : Promise.resolve({ data: [] as { id: string; trainee_id: string }[] }),
  ]);

  const pendingReports = (pending.data ?? []) as Report[];
  const draftReports = (drafts.data ?? []) as Report[];
  const unassignedRows = (unassigned.data ?? []) as { id: string; trainee_id: string }[];
  const names = await getProfilesMap([...pendingReports.map((r) => r.trainee_id), ...unassignedRows.map((u) => u.trainee_id)]);

  const todos: Todo[] = [];

  for (const r of pendingReports) {
    todos.push({ key: `review-${r.id}`, kind: "review", href: `/reports/weekly/${r.enrollment_id}/${r.period_index}`, who: names.get(r.trainee_id)?.display_name ?? null, week: r.period_index });
  }

  // Trainee: this week's weekly report not started yet (only for active enrollments with weekly enabled)
  for (const e of mine) {
    if (e.status !== "active" || !e.program.enabled_report_types.includes("weekly")) continue;
    const week = currentWeek(e.program, e);
    const { data: existing } = await admin.from("reports").select("id").eq("enrollment_id", e.id).eq("report_type", "weekly").eq("period_index", week).maybeSingle();
    if (!existing) todos.push({ key: `due-${e.id}-${week}`, kind: "weekly_due", href: `/reports/weekly/${e.id}/${week}`, who: null, week });
  }

  for (const r of draftReports) {
    todos.push({
      key: `draft-${r.id}`,
      kind: "draft",
      href: r.report_type === "weekly" ? `/reports/weekly/${r.enrollment_id}/${r.period_index}` : `/reports/interview/${r.enrollment_id}/${r.id}`,
      who: null,
      week: r.period_index,
      reportType: r.report_type === "weekly" ? "weekly" : "interview",
    });
  }

  for (const u of unassignedRows) {
    todos.push({ key: `nomentor-${u.id}`, kind: "no_mentor", href: `/trainees/${u.id}`, who: names.get(u.trainee_id)?.display_name ?? null, week: null });
  }

  return todos;
});
