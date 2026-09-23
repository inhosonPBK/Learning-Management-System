"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PROGRESS, parseReview, type WeeklyReview } from "@/lib/reports/schemas";
import { completeReview, saveReview } from "@/app/(app)/reports/actions";
import type { Report } from "@/types/db";
import { Section } from "./weekly-form";

export function ReviewPanel({ report, canReview, reviewerName, onChange }: { report: Report; canReview: boolean; reviewerName: string | null; onChange: (r: Report) => void }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const router = useRouter();
  const [review, setReview] = useState<WeeklyReview>(parseReview(report.review));
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  const completed = report.status === "completed";
  const editable = canReview && !completed;

  async function persist(next: WeeklyReview) {
    if (!editable) return;
    setHint(tc("saving"));
    const res = await saveReview(report.id, next);
    if ("error" in res) { setHint(""); toast.error(res.error); return; }
    onChange(res.data);
    setHint(tc("saved") + " ✓");
    setTimeout(() => setHint(""), 1500);
  }

  function set<K extends keyof WeeklyReview>(k: K, v: WeeklyReview[K], save = false) {
    const next = { ...review, [k]: v };
    setReview(next);
    if (save) void persist(next);
  }

  async function onComplete() {
    if (!review.progress) return toast.error(t("progressRequired"));
    if (!window.confirm(t("completeConfirm"))) return;
    setBusy(true);
    const res = await completeReview(report.id, review);
    setBusy(false);
    if ("error" in res) return toast.error(res.error === "progress-required" ? t("progressRequired") : res.error);
    onChange(res.data);
    toast.success(t("reviewCompleted"));
    router.refresh();
  }

  const rows: { key: keyof WeeklyReview; label: string; placeholder: string }[] = [
    { key: "good", label: t("review.good"), placeholder: t("review.goodPh") },
    { key: "next", label: t("review.next"), placeholder: t("review.nextPh") },
    { key: "qa", label: t("review.qa"), placeholder: t("review.qaPh") },
  ];

  return (
    <Section num="04" title={t("s4Title")} accent="gray">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="italic">
          {completed ? t("reviewDone", { name: reviewerName ?? "" }) : canReview ? t("reviewInstruction") : t("awaitingReview")}
        </span>
        <span>{hint}</span>
      </div>
      <div className="overflow-hidden rounded-lg border">
        {rows.map((r) => (
          <div key={r.key} className="flex border-b last:border-b-0">
            <div className="w-36 shrink-0 border-r bg-muted/60 px-3 py-2.5 text-xs font-semibold text-neutral-600">{r.label}</div>
            <div className="flex-1">
              <Textarea
                rows={3}
                value={review[r.key] as string}
                disabled={!editable}
                onChange={(e) => set(r.key, e.target.value)}
                onBlur={() => persist(review)}
                placeholder={editable ? r.placeholder : ""}
                className="rounded-none border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        ))}
        <div className="flex">
          <div className="w-36 shrink-0 border-r bg-muted/60 px-3 py-2.5 text-xs font-semibold text-neutral-600">{t("review.progress")}</div>
          <div className="flex flex-1 flex-wrap items-center gap-2 px-3 py-2.5">
            {PROGRESS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={!editable}
                onClick={() => set("progress", review.progress === p ? "" : p, true)}
                className={cn(
                  "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors disabled:opacity-70",
                  review.progress === p ? "border-neutral-600 bg-neutral-600 text-white" : "border-border bg-white text-muted-foreground",
                )}
              >
                {t(`progress.${p}`)}
              </button>
            ))}
            {!editable && !review.progress && <span className="text-sm text-muted-foreground">—</span>}
          </div>
        </div>
      </div>
      {editable && (
        <div className="no-print mt-5 text-center">
          <Button size="lg" className="bg-status-completed px-10 hover:bg-status-completed/90" onClick={onComplete} disabled={busy}>
            <CheckCircle2 />
            {busy ? t("completing") : t("completeReview")}
          </Button>
        </div>
      )}
    </Section>
  );
}
