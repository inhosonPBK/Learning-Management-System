"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { finalizeAvatar, removeAvatar, requestAvatarUpload } from "@/lib/avatars/actions";
import { AVATARS_BUCKET, AVATAR_SIZE } from "@/lib/avatars";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";

/** Picks an image, center-crops + resizes it to a 256px square JPEG in the browser, uploads directly to Storage. */
export function AvatarUploader({ profileId, name, currentUrl }: { profileId: string; name: string; currentUrl: string | null }) {
  const t = useTranslations("avatar");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  async function toSquareJpeg(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.88));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error(t("notImage"));
    setBusy(true);
    try {
      const blob = await toSquareJpeg(file);
      const req = await requestAvatarUpload(profileId, "image/jpeg", blob.size);
      if ("error" in req) throw new Error(req.error);
      const { error } = await createClient().storage.from(AVATARS_BUCKET).uploadToSignedUrl(req.data.path, req.data.token, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error(error.message);
      const fin = await finalizeAvatar(profileId, req.data.path);
      if ("error" in fin) throw new Error(fin.error);
      setPreview(URL.createObjectURL(blob));
      toast.success(t("updated"));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    if (!window.confirm(t("removeConfirm"))) return;
    setBusy(true);
    const res = await removeAvatar(profileId);
    setBusy(false);
    if ("error" in res) return toast.error(res.error);
    setPreview(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name} src={preview} className="size-20 border-2 border-brand-yellow" fallbackClassName="text-xl" />
      <div className="space-y-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : <Camera />}{preview ? t("change") : t("upload")}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}><Trash2 />{t("remove")}</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
    </div>
  );
}
