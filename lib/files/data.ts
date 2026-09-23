import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Viewer } from "@/lib/auth/viewer";
import { canManageEnrollments, canManageMaterials, canViewEnrollment } from "@/lib/auth/permissions";
import { getEnrollment } from "@/lib/data/programs";
import type { Attachment, AttachmentOwner } from "./types";
import type { Enrollment } from "@/types/db";

export async function getAttachments(ownerType: AttachmentOwner, ownerId: string, includePending = false): Promise<Attachment[]> {
  let q = createAdminClient().from("attachments").select("*").eq("owner_type", ownerType).eq("owner_id", ownerId).order("created_at");
  if (!includePending) q = q.eq("status", "ready");
  const { data } = await q;
  return (data ?? []) as Attachment[];
}

export async function getAttachmentsForOwners(ownerType: AttachmentOwner, ownerIds: string[]): Promise<Attachment[]> {
  if (!ownerIds.length) return [];
  const { data } = await createAdminClient().from("attachments").select("*").eq("owner_type", ownerType).in("owner_id", ownerIds).eq("status", "ready").order("created_at");
  return (data ?? []) as Attachment[];
}

export async function getAttachment(id: string): Promise<Attachment | null> {
  const { data } = await createAdminClient().from("attachments").select("*").eq("id", id).maybeSingle<Attachment>();
  return data ?? null;
}

export interface MaterialOwner {
  id: string;
  author_id: string | null;
  is_published: boolean;
}

/** Who may see / manage files on a given owner. */
export async function attachmentPermissions(viewer: Viewer, ownerType: AttachmentOwner, ownerId: string): Promise<{ view: boolean; manage: boolean }> {
  if (ownerType === "enrollment") {
    const e = await getEnrollment(ownerId);
    if (!e) return { view: false, manage: false };
    const view = await canViewEnrollment(viewer, e);
    const manage = canManageEnrollments(viewer) || isMentorOf(viewer, e);
    return { view, manage };
  }
  const { data: m } = await createAdminClient().from("training_materials").select("id, author_id, is_published").eq("id", ownerId).maybeSingle<MaterialOwner>();
  if (!m) return { view: false, manage: false };
  const manage = canManageMaterials(viewer, m);
  return { view: viewer.isActive && (m.is_published || manage), manage };
}

function isMentorOf(viewer: Viewer, e: Enrollment) {
  return e.mentor_id === viewer.id || viewer.coMentorOfEnrollmentIds.includes(e.id);
}
