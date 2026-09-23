"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { finalizeUpload, requestUpload } from "@/lib/files/actions";
import { DOCUMENTS_BUCKET, MAX_FILE_BYTES, type AttachmentOwner } from "@/lib/files/types";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * Browser → Supabase Storage direct upload via signed upload URL.
 * 1) requestUpload (server: authz + signed URL + pending row) 2) uploadToSignedUrl 3) finalizeUpload.
 */
export function FileUploader({
  ownerType,
  ownerId,
  kinds,
  accept,
  compact,
}: {
  ownerType: AttachmentOwner;
  ownerId: string;
  /** selectable kinds; when a single entry is given no selector is shown */
  kinds: { value: string; label: string }[];
  accept?: string;
  compact?: boolean;
}) {
  const t = useTranslations("files");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState(kinds[0]?.value ?? "other");
  const [busy, setBusy] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const supabase = createClient();
    let ok = 0;
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) { toast.error(t("tooLarge", { name: file.name })); continue; }
      setBusy(file.name);
      const req = await requestUpload({ ownerType, ownerId, kind, fileName: file.name, mimeType: file.type, size: file.size });
      if ("error" in req) { toast.error(req.error === "too-large" ? t("tooLarge", { name: file.name }) : req.error); continue; }
      const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).uploadToSignedUrl(req.data.path, req.data.token, file, { contentType: file.type || undefined, upsert: false });
      if (error) { toast.error(`${file.name}: ${error.message}`); continue; }
      const fin = await finalizeUpload(req.data.attachmentId);
      if ("error" in fin) { toast.error(fin.error); continue; }
      ok++;
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
    if (ok) { toast.success(t("uploaded", { count: ok })); router.refresh(); }
  }

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "flex flex-wrap items-end gap-2 rounded-lg border border-dashed bg-muted/30 p-3"}>
      {kinds.length > 1 && (
        <NativeSelect value={kind} onChange={(e) => setKind(e.target.value)} className="w-44" aria-label={t("kind")}>
          {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </NativeSelect>
      )}
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {busy ? t("uploading", { name: busy }) : t("upload")}
      </Button>
      {!compact && <span className="text-xs text-muted-foreground">{t("hint")}</span>}
    </div>
  );
}
