"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { AVATARS_BUCKET, AVATAR_MAX_BYTES } from "@/lib/avatars";

type Result<T> = { data: T } | { error: string };

function canManageAvatar(viewerId: string, isAdmin: boolean, targetId: string) {
  return isAdmin || viewerId === targetId;
}

/** Step 1 — signed upload URL for a (client-resized) JPEG/PNG/WebP avatar. */
export async function requestAvatarUpload(targetProfileId: string, mimeType: string, size: number): Promise<Result<{ path: string; token: string }>> {
  const viewer = await requireViewer();
  if (!canManageAvatar(viewer.id, viewer.isAdmin, targetProfileId)) return { error: "Not authorized" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return { error: "Unsupported image type" };
  if (size <= 0 || size > AVATAR_MAX_BYTES) return { error: "too-large" };
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(AVATARS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Could not create upload URL" };
  return { data: { path: data.path, token: data.token } };
}

/** Step 2 — point the profile at the uploaded object and drop the previous one. */
export async function finalizeAvatar(targetProfileId: string, path: string): Promise<Result<{ ok: true }>> {
  const viewer = await requireViewer();
  if (!canManageAvatar(viewer.id, viewer.isAdmin, targetProfileId)) return { error: "Not authorized" };
  const admin = createAdminClient();
  const { data: prev } = await admin.from("profiles").select("avatar_path").eq("id", targetProfileId).maybeSingle<{ avatar_path: string | null }>();
  const { error } = await admin.from("profiles").update({ avatar_path: path }).eq("id", targetProfileId);
  if (error) return { error: error.message };
  if (prev?.avatar_path && prev.avatar_path !== path) await admin.storage.from(AVATARS_BUCKET).remove([prev.avatar_path]);
  await logAudit(viewer.id, "profile.avatar", "profile", targetProfileId);
  revalidatePath("/", "layout");
  return { data: { ok: true } };
}

export async function removeAvatar(targetProfileId: string): Promise<Result<{ ok: true }>> {
  const viewer = await requireViewer();
  if (!canManageAvatar(viewer.id, viewer.isAdmin, targetProfileId)) return { error: "Not authorized" };
  const admin = createAdminClient();
  const { data: prev } = await admin.from("profiles").select("avatar_path").eq("id", targetProfileId).maybeSingle<{ avatar_path: string | null }>();
  if (prev?.avatar_path) await admin.storage.from(AVATARS_BUCKET).remove([prev.avatar_path]);
  const { error } = await admin.from("profiles").update({ avatar_path: null }).eq("id", targetProfileId);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "profile.avatar_removed", "profile", targetProfileId);
  revalidatePath("/", "layout");
  return { data: { ok: true } };
}
