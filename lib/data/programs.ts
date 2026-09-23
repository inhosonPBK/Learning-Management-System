import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Enrollment, Program, ReportType } from "@/types/db";

export const getPrograms = cache(async (): Promise<Program[]> => {
  const { data } = await createAdminClient().from("programs").select("*").order("start_date", { ascending: false });
  return (data ?? []) as Program[];
});

export async function getProgram(id: string): Promise<Program | null> {
  const { data } = await createAdminClient().from("programs").select("*").eq("id", id).maybeSingle<Program>();
  return data ?? null;
}

export const getReportTypes = cache(async (): Promise<ReportType[]> => {
  const { data } = await createAdminClient().from("report_types").select("*").order("sort_order");
  return (data ?? []) as ReportType[];
});

export async function getReportType(code: string): Promise<ReportType | null> {
  const types = await getReportTypes();
  return types.find((t) => t.code === code) ?? null;
}

export interface EnrollmentWithProgram extends Enrollment {
  program: Program;
}

/** Enrollment + its program, or null. */
export async function getEnrollment(id: string): Promise<EnrollmentWithProgram | null> {
  const admin = createAdminClient();
  const { data: e } = await admin.from("enrollments").select("*").eq("id", id).maybeSingle<Enrollment>();
  if (!e) return null;
  const { data: p } = await admin.from("programs").select("*").eq("id", e.program_id).single<Program>();
  if (!p) return null;
  return { ...e, program: p };
}

export async function getEnrollmentsByIds(ids: string[]): Promise<EnrollmentWithProgram[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const { data: es } = await createAdminClient().from("enrollments").select("*").in("id", unique);
  return attachPrograms((es ?? []) as Enrollment[]);
}

export async function getEnrollmentsForProgram(programId: string): Promise<Enrollment[]> {
  const { data } = await createAdminClient().from("enrollments").select("*").eq("program_id", programId).order("created_at");
  return (data ?? []) as Enrollment[];
}

export async function getEnrollmentsForTrainees(traineeIds: string[]): Promise<EnrollmentWithProgram[]> {
  if (!traineeIds.length) return [];
  const { data } = await createAdminClient().from("enrollments").select("*").in("trainee_id", traineeIds);
  return attachPrograms((data ?? []) as Enrollment[]);
}

/** Joins programs onto enrollment rows with a single extra query. */
async function attachPrograms(enrollments: Enrollment[]): Promise<EnrollmentWithProgram[]> {
  if (!enrollments.length) return [];
  const programIds = [...new Set(enrollments.map((e) => e.program_id))];
  const { data: ps } = await createAdminClient().from("programs").select("*").in("id", programIds);
  const programs = new Map(((ps ?? []) as Program[]).map((p) => [p.id, p]));
  return enrollments.filter((e) => programs.has(e.program_id)).map((e) => ({ ...e, program: programs.get(e.program_id)! }));
}

export function programLabel(p: Program, locale: "ko" | "en") {
  return locale === "ko" ? p.name_ko : p.name_en;
}
