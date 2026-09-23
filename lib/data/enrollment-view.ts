import "server-only";
import { notFound, redirect } from "next/navigation";
import type { Viewer } from "@/lib/auth/viewer";
import { canViewEnrollment } from "@/lib/auth/permissions";
import { getEnrollment, type EnrollmentWithProgram } from "@/lib/data/programs";
import { getProfilesMap, getTeams } from "@/lib/data/org";
import type { Profile, Team } from "@/types/db";

export interface EnrollmentView {
  enrollment: EnrollmentWithProgram;
  trainee: Profile;
  mentor: Profile | null;
  team: Team | null;
}

/** Loads an enrollment and its people; 404 if missing, redirect if the viewer may not see it. */
export async function loadEnrollmentForViewer(viewer: Viewer, enrollmentId: string): Promise<EnrollmentView> {
  const enrollment = await getEnrollment(enrollmentId);
  if (!enrollment) notFound();
  if (!(await canViewEnrollment(viewer, enrollment))) redirect("/reports");
  const people = await getProfilesMap([enrollment.trainee_id, enrollment.mentor_id ?? ""]);
  const trainee = people.get(enrollment.trainee_id);
  if (!trainee) notFound();
  const teams = await getTeams();
  return {
    enrollment,
    trainee,
    mentor: enrollment.mentor_id ? people.get(enrollment.mentor_id) ?? null : null,
    team: teams.find((t) => t.code === trainee.team_code) ?? null,
  };
}
