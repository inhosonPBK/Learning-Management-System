"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth/viewer";
import { canCreateMaterial, canManageMaterials } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { getAttachments } from "@/lib/files/data";
import { DOCUMENTS_BUCKET } from "@/lib/files/types";
import type { ActionState } from "@/components/forms/action-form";

const str = (v: FormData, k: string) => (v.get(k)?.toString().trim() ?? "");

const schema = z.object({
  title: z.string().min(1).max(200),
  category_code: z.string().min(1),
  body: z.string().max(50000).nullable(),
  program_types: z.array(z.enum(["intern", "new_hire", "ojt"])).nullable(),
  is_published: z.boolean(),
});

function read(fd: FormData) {
  const types = fd.getAll("program_types").map(String);
  return schema.safeParse({
    title: str(fd, "title"),
    category_code: str(fd, "category_code"),
    body: str(fd, "body") || null,
    program_types: types.length ? types : null,
    is_published: fd.get("is_published") === "on",
  });
}

export async function createMaterial(_p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  if (!canCreateMaterial(viewer)) return { error: "Not authorized" };
  const parsed = read(fd);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { data, error } = await createAdminClient()
    .from("training_materials")
    .insert({ ...parsed.data, author_id: viewer.id, published_at: parsed.data.is_published ? new Date().toISOString() : null })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await logAudit(viewer.id, "material.create", "material", data.id, { title: parsed.data.title });
  revalidatePath("/materials");
  redirect(`/materials/${data.id}`);
}

export async function updateMaterial(id: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const admin = createAdminClient();
  const { data: m } = await admin.from("training_materials").select("author_id, is_published").eq("id", id).maybeSingle<{ author_id: string | null; is_published: boolean }>();
  if (!m || !canManageMaterials(viewer, m)) return { error: "Not authorized" };
  const parsed = read(fd);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { error } = await admin
    .from("training_materials")
    .update({ ...parsed.data, published_at: parsed.data.is_published && !m.is_published ? new Date().toISOString() : undefined })
    .eq("id", id);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "material.update", "material", id, { title: parsed.data.title, published: parsed.data.is_published });
  revalidatePath("/materials");
  revalidatePath(`/materials/${id}`);
  return { ok: true };
}

export async function deleteMaterial(id: string): Promise<void> {
  const viewer = await requireViewer();
  const admin = createAdminClient();
  const { data: m } = await admin.from("training_materials").select("author_id, title").eq("id", id).maybeSingle<{ author_id: string | null; title: string }>();
  if (!m || !canManageMaterials(viewer, m)) throw new Error("Not authorized");
  const files = await getAttachments("material", id, true);
  if (files.length) {
    await admin.storage.from(DOCUMENTS_BUCKET).remove(files.map((f) => f.storage_path));
    await admin.from("attachments").delete().eq("owner_type", "material").eq("owner_id", id);
  }
  const { error } = await admin.from("training_materials").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit(viewer.id, "material.delete", "material", id, { title: m.title, files: files.length });
  revalidatePath("/materials");
  redirect("/materials");
}

export async function bumpViewCount(id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("training_materials").select("view_count").eq("id", id).maybeSingle<{ view_count: number }>();
  if (data) await admin.from("training_materials").update({ view_count: data.view_count + 1 }).eq("id", id);
}
