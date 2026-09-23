"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, RotateCcw, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { parseInterview } from "@/lib/reports/schemas";
import { deleteReport, recallReport, saveInterviewDraft, submitInterview } from "@/app/(app)/reports/actions";
import type { Report } from "@/types/db";

export function InterviewForm({ enrollmentId, initialReport, canEdit, canDelete }: { enrollmentId: string; initialReport: Report | null; canEdit: boolean; canDelete: boolean }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [report, setReport] = useState<Report | null>(initialReport);
  const [date, setDate] = useState(initialReport?.report_date ?? today);
  const [content, setContent] = useState(initialReport ? parseInterview(initialReport.content).content : "");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = report?.status ?? "draft";
  const locked = status !== "draft";
  const editable = canEdit && !locked;
  const listHref = `/reports/interview/${enrollmentId}`;

  const autoSave = useCallback(
    (nextDate: string, nextContent: string) => {
      if (!editable) return;
      if (timer.current) clearTimeout(timer.current);
      setHint(tc("saving"));
      timer.current = setTimeout(async () => {
        const res = await saveInterviewDraft({ reportId: report?.id, enrollmentId, reportDate: nextDate, content: { content: nextContent } });
        if ("error" in res) { setHint(""); if (res.error !== "date-required") toast.error(res.error); return; }
        if (!report) router.replace(`/reports/interview/${enrollmentId}/${res.data.id}`);
        setReport(res.data);
        setHint(tc("saved") + " ✓");
        setTimeout(() => setHint(""), 1500);
      }, 800);
    },
    [editable, enrollmentId, report, router, tc],
  );

  async function onSubmit() {
    if (!content.trim() && !window.confirm(t("submitEmptyInterview"))) return;
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    const res = await submitInterview({ reportId: report?.id, enrollmentId, reportDate: date, content: { content } });
    setBusy(false);
    if ("error" in res) return toast.error(res.error);
    setReport(res.data);
    toast.success(t("submitted"));
    router.push(listHref);
    router.refresh();
  }

  async function onRecall() {
    if (!report || !window.confirm(t("recallConfirm"))) return;
    setBusy(true);
    const res = await recallReport(report.id);
    setBusy(false);
    if ("error" in res) return toast.error(res.error);
    setReport(res.data);
    router.refresh();
  }

  async function onDelete() {
    if (!report || !window.confirm(t("deleteConfirm"))) return;
    setBusy(true);
    const res = await deleteReport(report.id);
    setBusy(false);
    if ("error" in res) return toast.error(res.error);
    router.push(listHref);
    router.refresh();
  }

  return (
    <div className="space-y-5 rounded-xl border bg-white p-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("interviewDate")}</Label>
          <Input id="date" type="date" value={date} disabled={!editable} onChange={(e) => { setDate(e.target.value); autoSave(e.target.value, content); }} className="w-44" />
        </div>
        <span className="pb-2 text-xs text-muted-foreground">{hint}</span>
        <div className="ml-auto pb-1"><StatusBadge status={status} /></div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("interviewContent")}</Label>
        <Textarea
          rows={12}
          value={content}
          disabled={!editable}
          onChange={(e) => { setContent(e.target.value); autoSave(date, e.target.value); }}
          placeholder={t("interviewPlaceholder")}
        />
      </div>

      {status === "submitted" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-status-completed">
          <span className="font-semibold">{t("interviewSubmitted")}</span> · {t("interviewSubmittedSub")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {editable && (
          <Button onClick={onSubmit} disabled={busy} className="px-8">{busy ? t("submitting") : t("submit")}</Button>
        )}
        {canEdit && status === "submitted" && (
          <Button variant="outline" onClick={onRecall} disabled={busy}><RotateCcw />{t("editAgain")}</Button>
        )}
        {report && status === "submitted" && (
          <Button variant="outline" nativeButton={false} render={<a href={`/reports/interview/${enrollmentId}/${report.id}/print`} target="_blank" rel="noreferrer" />}>
            <Printer />{tc("print")}
          </Button>
        )}
        <Button variant="ghost" nativeButton={false} render={<a href={listHref} />}>{t("backToList")}</Button>
        {report && canDelete && (
          <Button variant="destructive" onClick={onDelete} disabled={busy} className="ml-auto"><Trash2 />{tc("delete")}</Button>
        )}
      </div>
    </div>
  );
}
