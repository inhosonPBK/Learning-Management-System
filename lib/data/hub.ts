import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { getEnrollmentsByIds, getEnrollmentsForTrainees, programLabel, type EnrollmentWithProgram } from "@/lib/data/programs";
import { getReportsForEnrollments, summarize } from "@/lib/data/reports";
import { getProfilesMap, getTeams, teamLabel } from "@/lib/data/org";
import { getAttachmentsForOwners } from "@/lib/files/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentWeek, totalWeeks } from "@/lib/weeks";
import type { EnrollmentCardData } from "@/components/reports/enrollment-card";
import type { Locale, Report } from "@/types/db";

export interface HubData {
  mine: EnrollmentCardData[];
  mentees: EnrollmentCardData[];
  team: EnrollmentCardData[];
  all: EnrollmentCardData[];
  /** every enrollment the viewer may see (deduped) */
  visibleEnrollmentIds: string[];
  /** submitted weekly reports awaiting the viewer's review */
  pendingReviews: Report[];
  /** viewer's own weekly drafts */
  myDrafts: Report[];
}

/** Everything the /reports hub and dashboard sections need, scoped to what the viewer may see. */
export async function getHubData(viewer: Viewer, locale: Locale): Promise<HubData> {
  const oversight = viewer.isAdmin || viewer.isPeopleOps || viewer.isGm;

  const [mine, mentees, team, all] = await Promise.all([
    getEnrollmentsByIds(viewer.myEnrollmentIds),
    getEnrollmentsByIds([...viewer.mentorOfEnrollmentIds, ...viewer.coMentorOfEnrollmentIds, ...viewer.watcherOfEnrollmentIds]),
    getEnrollmentsForTrainees(viewer.directReportIds),
    oversight ? allActiveEnrollments() : Promise.resolve([] as EnrollmentWithProgram[]),
  ]);

  const every = dedupe([...mine, ...mentees, ...team, ...all]);
  // Second stage: three independent lookups in parallel (one network round trip instead of three).
  const [reports, profiles, teamRows, docs] = await Promise.all([
    getReportsForEnrollments(every.map((e) => e.id)),
    getProfilesMap(every.flatMap((e) => [e.trainee_id, e.mentor_id ?? ""])),
    getTeams(),
    getAttachmentsForOwners("enrollment", every.map((e) => e.id)),
  ]);
  const teams = new Map(teamRows.map((t) => [t.code, t]));

  const toCard = (e: EnrollmentWithProgram): EnrollmentCardData => {
    const trainee = profiles.get(e.trainee_id);
    const rs = reports.filter((r) => r.enrollment_id === e.id);
    return {
      enrollmentId: e.id,
      traineeName: trainee?.display_name ?? "—",
      traineeTitle: trainee?.job_title ?? null,
      teamName: teamLabel(teams.get(trainee?.team_code ?? ""), locale),
      programName: programLabel(e.program, locale),
      mentorName: e.mentor_id ? profiles.get(e.mentor_id)?.display_name ?? null : null,
      currentWeek: currentWeek(e.program, e),
      totalWeeks: totalWeeks(e.program, e),
      stats: summarize(rs),
      status: e.status,
      enabledTypes: e.program.enabled_report_types,
      docsCount: docs.filter((d) => d.owner_id === e.id).length,
    };
  };

  const menteeIds = new Set([...viewer.mentorOfEnrollmentIds, ...viewer.coMentorOfEnrollmentIds]);
  return {
    mine: mine.map(toCard),
    mentees: mentees.map(toCard),
    team: team.filter((e) => !menteeIds.has(e.id)).map(toCard),
    all: all.map(toCard),
    visibleEnrollmentIds: every.map((e) => e.id),
    pendingReviews: reports.filter((r) => r.report_type === "weekly" && r.status === "submitted" && menteeIds.has(r.enrollment_id)),
    myDrafts: reports.filter((r) => r.author_id === viewer.id && r.status === "draft"),
  };
}

async function allActiveEnrollments(): Promise<EnrollmentWithProgram[]> {
  const { data } = await createAdminClient().from("enrollments").select("id").eq("status", "active");
  return getEnrollmentsByIds((data ?? []).map((r) => r.id));
}

function dedupe(list: EnrollmentWithProgram[]) {
  const seen = new Set<string>();
  return list.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}
