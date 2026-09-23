import { getTranslations } from "next-intl/server";
import { FileText, FileSpreadsheet, File as FileIcon, Download, Trash2, Image as ImageIcon } from "lucide-react";
import { deleteAttachmentForm } from "@/lib/files/actions";
import { formatBytes, type Attachment } from "@/lib/files/types";
import { getProfilesMap } from "@/lib/data/org";
import { formatDate } from "@/lib/weeks";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/db";

function iconFor(mime: string | null, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime?.startsWith("image/")) return ImageIcon;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["doc", "docx", "pdf", "ppt", "pptx", "txt", "md"].includes(ext)) return FileText;
  return FileIcon;
}

/** Server component: read-only list of ready attachments with download links and optional delete. */
export async function AttachmentList({
  attachments,
  canManage,
  locale,
  kindLabels,
  emptyText,
  className,
}: {
  attachments: Attachment[];
  canManage: boolean;
  locale: Locale;
  kindLabels?: Record<string, string>;
  emptyText?: string;
  className?: string;
}) {
  const t = await getTranslations("files");
  const uploaders = await getProfilesMap(attachments.map((a) => a.uploaded_by ?? ""));
  if (!attachments.length) return <p className={cn("text-xs text-muted-foreground", className)}>{emptyText ?? t("none")}</p>;

  return (
    <ul className={cn("divide-y rounded-lg border bg-white", className)}>
      {attachments.map((a) => {
        const Icon = iconFor(a.mime_type, a.file_name);
        return (
          <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <Icon className="size-4 shrink-0 text-brand-blue" />
            <a href={`/api/files/${a.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline" title={a.file_name}>
              {a.file_name}
            </a>
            {kindLabels?.[a.kind] && <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground sm:inline">{kindLabels[a.kind]}</span>}
            <span className="hidden text-xs text-muted-foreground md:inline">{formatBytes(a.size_bytes)}</span>
            <span className="hidden text-xs text-muted-foreground lg:inline">{uploaders.get(a.uploaded_by ?? "")?.display_name} · {formatDate(a.created_at, locale)}</span>
            <a href={`/api/files/${a.id}`} className="text-muted-foreground hover:text-brand-blue" aria-label={t("download")} title={t("download")}><Download className="size-4" /></a>
            {canManage && (
              <form action={deleteAttachmentForm.bind(null, a.id)}>
                <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label={t("delete")} title={t("delete")}><Trash2 className="size-4" /></button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
