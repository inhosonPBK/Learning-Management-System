"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { parsePlan } from "@/lib/reports/plan";
import type { ActionState } from "@/components/forms/action-form";

const str = (v: FormData, k: string) => (v.get(k)?.toString().trim() ?? "");

const programSchema = z
  .object({
    program_type: z.enum(["intern", "new_hire", "ojt"]),
    name_ko: z.string().min(1),
    name_en: z.string().min(1),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    duration_weeks: z.coerce.number().int().min(1).max(104),
    enabled_report_types: z.array(z.enum(["weekly", "training", "interview"])).min(1),
    status: z.enum(["planned", "active", "closed"]),
  })
  .refine((d) => d.end_date >= d.start_date, { message: "End date must be after start date", path: ["end_date"] });

function readProgram(fd: FormData) {
  const start = str(fd, "start_date");
  const end = str(fd, "end_date");
  let weeks = str(fd, "duration_weeks");
  if (!weeks && start && end) {
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000 + 1;
    weeks = String(Math.max(1, Math.ceil(days / 7)));
  }
  return programSchema.safeParse({
    program_type: str(fd, "program_type"),
    name_ko: str(fd, "name_ko"),
    name_en: str(fd, "name_en"),
    start_date: start,
    end_date: end,
    duration_weeks: weeks,
    enabled_report_types: fd.getAll("enabled_report_types").map(String),
    status: str(fd, "status") || "planned",
  });
}

export async function createProgram(_p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireStaff();
  const parsed = readProgram(fd);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { data, error } = await createAdminClient().from("programs").insert({ ...parsed.data, created_by: viewer.id }).select("id").single();
  if (error) return { error: error.message };
  await logAudit(viewer.id, "program.create", "program", data.id, { name: parsed.data.name_en });
  revalidatePath("/admin/programs");
  redirect(`/admin/programs/${data.id}`);
}

export async function updateProgram(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireStaff();
  const parsed = readProgram(fd);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { error } = await createAdminClient().from("programs").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "program.update", "program", id, parsed.data);
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${id}`);
  return { ok: true };
}

// ── Enrollments ────────────────────────────────────────────────────────────

export async function enrollTrainee(programId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireStaff();
  const trainee_id = str(fd, "trainee_id");
  const mentor_id = str(fd, "mentor_id") || null;
  if (!trainee_id) return { error: "Select a trainee." };
  if (mentor_id === trainee_id) return { error: "Mentor and trainee must differ." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enrollments")
    .insert({
      program_id: programId,
      trainee_id,
      mentor_id,
      start_date: str(fd, "start_date") || null,
      end_date: str(fd, "end_date") || null,
      jd_text: str(fd, "jd_text") || null,
      training_plan: parsePlan(str(fd, "training_plan")),
      status: "active",
    })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "This person is already enrolled in this program." : error.message };
  await logAudit(viewer.id, "enrollment.create", "enrollment", data.id, { program_id: programId, trainee_id, mentor_id });
  revalidatePath(`/admin/programs/${programId}`);
  return { ok: true };
}

export async function updateEnrollment(enrollmentId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireStaff();
  const admin = createAdminClient();
  const { data: e } = await admin.from("enrollments").select("program_id, trainee_id").eq("id", enrollmentId).maybeSingle();
  if (!e) return { error: "Not found" };
  const mentor_id = str(fd, "mentor_id") || null;
  if (mentor_id === e.trainee_id) return { error: "Mentor and trainee must differ." };
  const status = str(fd, "status") as "active" | "completed" | "withdrawn";

  const { error } = await admin
    .from("enrollments")
    .update({
      mentor_id,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      start_date: str(fd, "start_date") || null,
      end_date: str(fd, "end_date") || null,
      jd_text: str(fd, "jd_text") || null,
      training_plan: parsePlan(str(fd, "training_plan")),
    })
    .eq("id", enrollmentId);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "enrollment.update", "enrollment", enrollmentId, { mentor_id, status });
  revalidatePath(`/admin/programs/${e.program_id}`);
  revalidatePath(`/trainees/${enrollmentId}`);
  return { ok: true };
}

export async function addWatcher(enrollmentId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireStaff();
  const profile_id = str(fd, "profile_id");
  const role = str(fd, "role") === "co_mentor" ? "co_mentor" : "observer";
  if (!profile_id) return { error: "Select a person." };
  const admin = createAdminClient();
  const { data: e } = await admin.from("enrollments").select("program_id").eq("id", enrollmentId).maybeSingle();
  if (!e) return { error: "Not found" };
  const { error } = await admin.from("enrollment_watchers").upsert({ enrollment_id: enrollmentId, profile_id, role });
  if (error) return { error: error.message };
  await logAudit(viewer.id, "enrollment.add_watcher", "enrollment", enrollmentId, { profile_id, role });
  revalidatePath(`/admin/programs/${e.program_id}`);
  return { ok: true };
}

/** Plain form action (returns void) — used by the inline ✕ button on each watcher chip. */
export async function removeWatcher(enrollmentId: string, profileId: string): Promise<void> {
  const viewer = await requireStaff();
  const admin = createAdminClient();
  const { data: e } = await admin.from("enrollments").select("program_id").eq("id", enrollmentId).maybeSingle();
  const { error } = await admin.from("enrollment_watchers").delete().eq("enrollment_id", enrollmentId).eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  await logAudit(viewer.id, "enrollment.remove_watcher", "enrollment", enrollmentId, { profile_id: profileId });
  if (e) revalidatePath(`/admin/programs/${e.program_id}`);
}
