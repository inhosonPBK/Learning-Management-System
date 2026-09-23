import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachmentPermissions, getAttachment } from "@/lib/files/data";
import { DOCUMENTS_BUCKET } from "@/lib/files/types";

/** Permission-checked download: redirects to a short-lived signed URL (private bucket). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer || !viewer.isActive) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const att = await getAttachment(id);
  if (!att || att.status !== "ready") return new NextResponse("Not found", { status: 404 });

  const { view } = await attachmentPermissions(viewer, att.owner_type, att.owner_id);
  if (!view) return new NextResponse("Forbidden", { status: 403 });

  const { data, error } = await createAdminClient()
    .storage.from(DOCUMENTS_BUCKET)
    .createSignedUrl(att.storage_path, 60, { download: att.file_name });
  if (error || !data) return new NextResponse("Storage error", { status: 500 });

  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
