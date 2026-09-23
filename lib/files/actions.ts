"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { attachmentPermissions, getAttachment } from "./data";
import { DOCUMENTS_BUCKET, MAX_FILE_BYTES, type AttachmentOwner } from "./types";

type Result<T> = { data: T } | { error: string };

const KINDS: Record<AttachmentOwner, string[]> = {
  enrollment: ["training_plan", "jd", "other"],
  material: ["file"],
};

/** Display name kept in the DB (Korean allowed); only control/reserved characters stripped. */
function safeName(name: string) {
  return name.normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 150) || "file";
}

/** Storage object keys must be ASCII-safe — use uuid + sanitized extension only. */
function storageKey(ownerType: AttachmentOwner, ownerId: string, fileName: string) {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  return `${ownerType}/${ownerId}/${randomUUID()}${ext ? `.${ext}` : ""}`;
}

async function revalidateOwner(ownerType: AttachmentOwner, ownerId: string) {
  if (ownerType === "enrollment") {
    const { data } = await createAdminClient().from("enrollments").select("program_id").eq("id", ownerId).maybeSingle();
    if (data) revalidatePath(`/admin/programs/${data.program_id}`);
    revalidatePath(`/trainees/${ownerId}`);
  } else {
    revalidatePath(`/materials/${ownerId}`);
    revalidatePath("/materials");
  }
}

/**
 * Step 1 — authorize and create a signed upload URL so the browser streams the file straight to
 * Supabase Storage (bypasses the 4.5 MB Vercel request limit). Inserts a pending attachment row.
 */
export async function requestUpload(input: {
  ownerType: AttachmentOwner;
  ownerId: string;
  kind: string;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<Result<{ attachmentId: string; path: string; token: string }>> {
  const viewer = await requireViewer();
  if (!KINDS[input.ownerType]?.includes(input.kind)) return { error: "Invalid kind" };
  if (!Number.isFinite(input.size) || input.size <= 0) return { error: "Empty file" };
  if (input.size > MAX_FILE_BYTES) return { error: "too-large" };

  const { manage } = await attachmentPermissions(viewer, input.ownerType, input.ownerId);
  if (!manage) return { error: "Not authorized" };

  const admin = createAdminClient();
  const name = safeName(input.fileName);
  const path = storageKey(input.ownerType, input.ownerId, name);

  // Sweep abandoned pending rows for this owner (browser closed mid-upload, storage rejected, …).
  await admin
    .from("attachments")
    .delete()
    .eq("owner_type", input.ownerType)
    .eq("owner_id", input.ownerId)
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const { data: signed, error: sErr } = await admin.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (sErr || !signed) return { error: sErr?.message ?? "Could not create upload URL" };

  const { data: row, error } = await admin
    .from("attachments")
    .insert({
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      kind: input.kind,
      storage_path: path,
      file_name: name,
      mime_type: input.mimeType || null,
      size_bytes: input.size,
      status: "pending",
      uploaded_by: viewer.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  return { data: { attachmentId: row.id, path: signed.path, token: signed.token } };
}

/** Step 2 — after the browser upload succeeds, verify the object exists and mark the row ready. */
export async function finalizeUpload(attachmentId: string): Promise<Result<{ ok: true }>> {
  const viewer = await requireViewer();
  const att = await getAttachment(attachmentId);
  if (!att || att.uploaded_by !== viewer.id) return { error: "Not found" };

  const admin = createAdminClient();
  const dir = att.storage_path.slice(0, att.storage_path.lastIndexOf("/"));
  const base = att.storage_path.slice(att.storage_path.lastIndexOf("/") + 1);
  const { data: objects } = await admin.storage.from(DOCUMENTS_BUCKET).list(dir, { search: base });
  const obj = objects?.find((o) => o.name === base);
  if (!obj) {
    await admin.from("attachments").delete().eq("id", attachmentId);
    return { error: "Upload not found in storage" };
  }

  const size = (obj.metadata as { size?: number } | null)?.size ?? att.size_bytes;
  await admin.from("attachments").update({ status: "ready", size_bytes: size }).eq("id", attachmentId);
  await logAudit(viewer.id, "file.upload", att.owner_type, att.owner_id, { file: att.file_name, kind: att.kind, size });
  await revalidateOwner(att.owner_type, att.owner_id);
  return { data: { ok: true } };
}

export async function deleteAttachment(attachmentId: string): Promise<Result<{ ok: true }>> {
  const viewer = await requireViewer();
  const att = await getAttachment(attachmentId);
  if (!att) return { error: "Not found" };
  const { manage } = await attachmentPermissions(viewer, att.owner_type, att.owner_id);
  if (!manage && att.uploaded_by !== viewer.id) return { error: "Not authorized" };

  const admin = createAdminClient();
  await admin.storage.from(DOCUMENTS_BUCKET).remove([att.storage_path]);
  const { error } = await admin.from("attachments").delete().eq("id", attachmentId);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "file.delete", att.owner_type, att.owner_id, { file: att.file_name });
  await revalidateOwner(att.owner_type, att.owner_id);
  return { data: { ok: true } };
}

/** Plain form action for the delete button. */
export async function deleteAttachmentForm(attachmentId: string): Promise<void> {
  const res = await deleteAttachment(attachmentId);
  if ("error" in res) throw new Error(res.error);
}
