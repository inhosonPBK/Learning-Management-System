export type AttachmentOwner = "enrollment" | "material";
export type EnrollmentDocKind = "training_plan" | "jd" | "other";

export interface Attachment {
  id: string;
  owner_type: AttachmentOwner;
  owner_id: string;
  kind: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: "pending" | "ready";
  uploaded_by: string | null;
  created_at: string;
}

export const DOCUMENTS_BUCKET = "documents";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
