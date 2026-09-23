"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/password";
import type { ActionState } from "@/components/forms/action-form";

const str = (v: FormData, k: string) => (v.get(k)?.toString().trim() ?? "");
const opt = (v: FormData, k: string) => str(v, k) || null;

const profileSchema = z.object({
  display_name: z.string().min(1),
  email: z.string().email(),
  name_ko: z.string().nullable(),
  job_title: z.string().nullable(),
  entity: z.enum(["PBK", "PK", "SHARED"]).nullable(),
  team_code: z.string().nullable(),
  dept_code: z.string().nullable(),
  employee_type: z.enum(["Employee", "Intern", "Consultant", "Agency Project"]).nullable(),
  manager_id: z.string().uuid().nullable(),
});

function readProfile(fd: FormData) {
  return profileSchema.safeParse({
    display_name: str(fd, "display_name"),
    email: str(fd, "email").toLowerCase(),
    name_ko: opt(fd, "name_ko"),
    job_title: opt(fd, "job_title"),
    entity: opt(fd, "entity"),
    team_code: opt(fd, "team_code"),
    dept_code: opt(fd, "dept_code"),
    employee_type: opt(fd, "employee_type"),
    manager_id: opt(fd, "manager_id"),
  });
}

/** Create profile + auth user; returns the one-time temp password. */
export async function createUser(_p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  const parsed = readProfile(fd);
  if (!parsed.success) return { error: "Invalid input: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (existing) return { error: "A profile with this email already exists." };

  const password = generateTempPassword();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.display_name },
  });
  if (authErr) return { error: authErr.message };

  const { data: profile, error } = await admin
    .from("profiles")
    .insert({ ...parsed.data, auth_user_id: created.user.id, is_active: true, must_change_password: true })
    .select("id")
    .single();
  if (error) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: error.message };
  }

  await logAudit(viewer.id, "user.create", "profile", profile.id, { email: parsed.data.email });
  revalidatePath("/admin/users");
  return { ok: true, tempPassword: password, info: `${parsed.data.display_name} <${parsed.data.email}>` };
}

export async function updateUser(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  const parsed = readProfile(fd);
  if (!parsed.success) return { error: "Invalid input: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  if (parsed.data.manager_id === id) return { error: "A person cannot be their own manager." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  await logAudit(viewer.id, "user.update", "profile", id, parsed.data);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true };
}

export async function updateFlags(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  const flags = {
    is_admin: fd.get("is_admin") === "on",
    is_people_ops: fd.get("is_people_ops") === "on",
    is_gm: fd.get("is_gm") === "on",
  };
  if (id === viewer.id && !flags.is_admin) return { error: "You cannot remove your own admin flag." };

  const { error } = await createAdminClient().from("profiles").update(flags).eq("id", id);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "user.flags", "profile", id, flags);
  revalidatePath(`/admin/users/${id}`);
  return { ok: true };
}

/** Issue a new temp password and force a change on next login. */
export async function resetTempPassword(id: string, _p?: ActionState, _fd?: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("auth_user_id, email, is_active").eq("id", id).maybeSingle();
  if (!p?.auth_user_id || !p.is_active) return { error: "User has no active login." };

  const password = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(p.auth_user_id, { password });
  if (error) return { error: error.message };
  await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
  await logAudit(viewer.id, "user.reset_password", "profile", id);
  return { ok: true, tempPassword: password, info: p.email };
}

/** Deactivate: remove login, keep profile & reports, unassign as mentor on active enrollments. */
export async function deactivateUser(id: string, _p?: ActionState, _fd?: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  if (id === viewer.id) return { error: "You cannot deactivate yourself." };
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("auth_user_id").eq("id", id).maybeSingle();
  if (!p) return { error: "Not found" };

  if (p.auth_user_id) await admin.auth.admin.deleteUser(p.auth_user_id);
  await admin.from("profiles").update({ is_active: false, deactivated_at: new Date().toISOString(), auth_user_id: null }).eq("id", id);

  const { data: affected } = await admin.from("enrollments").select("id, trainee_id").eq("mentor_id", id).eq("status", "active");
  if (affected?.length) await admin.from("enrollments").update({ mentor_id: null }).eq("mentor_id", id).eq("status", "active");

  await logAudit(viewer.id, "user.deactivate", "profile", id, { unassigned_enrollments: affected?.length ?? 0 });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true, info: affected?.length ? `Unassigned as mentor on ${affected.length} active enrollment(s).` : undefined };
}

/** Reactivate: create a fresh login with a temp password. */
export async function reactivateUser(id: string, _p?: ActionState, _fd?: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("email, display_name, auth_user_id").eq("id", id).maybeSingle();
  if (!p) return { error: "Not found" };

  const password = generateTempPassword();
  let authId = p.auth_user_id as string | null;
  if (!authId) {
    const { data, error } = await admin.auth.admin.createUser({ email: p.email, password, email_confirm: true, user_metadata: { display_name: p.display_name } });
    if (error) return { error: error.message };
    authId = data.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(authId, { password });
    if (error) return { error: error.message };
  }
  await admin.from("profiles").update({ is_active: true, deactivated_at: null, auth_user_id: authId, must_change_password: true }).eq("id", id);
  await logAudit(viewer.id, "user.reactivate", "profile", id);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  return { ok: true, tempPassword: password, info: p.email };
}

export async function goToUser(fd: FormData) {
  const id = fd.get("id")?.toString();
  if (id) redirect(`/admin/users/${id}`);
}
