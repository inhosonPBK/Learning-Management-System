"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Lock, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { RATINGS, emptyWeekly, parseWeekly, type WeeklyContent } from "@/lib/reports/schemas";
import { recallReport, saveWeeklyDraft, submitWeekly } from "@/app/(app)/reports/actions";
import type { Report } from "@/types/db";
import { ReviewPanel } from "./review-panel";

export interface WeeklyFormProps {
  enrollmentId: string;
  week: number;
  totalWeeks: number;
  weekLabel: string;
  initialReport: Report | null;
  /** viewer is the trainee/author and may edit drafts */
  canEdit: boolean;
  /** viewer may review (mentor / co-mentor) */
  canReview: boolean;
  /** viewer is the trainee (sees own report; review is read-only) */
  isTrainee: boolean;
  reviewerName: string | null;
}

export function WeeklyForm(props: WeeklyFormProps) {
  const { enrollmentId, week, totalWeeks, weekLabel, canEdit, canReview, isTrainee, reviewerName } = props;
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(props.initialReport);
  const [content, setContent] = useState<WeeklyContent>(props.initialReport ? parseWeekly(props.initialReport.content) : emptyWeekly);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [topicNudge, setTopicNudge] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Parent remounts this component per enrollment+week via `key`, so no prop→state sync effect is needed.

  const status = report?.status ?? "draft";
  const locked = status !== "draft";
  const editable = canEdit && !locked;

  const autoSave = useCallback(
    (next: WeeklyContent) => {
      if (!editable) return;
      if (timer.current) clearTimeout(timer.current);
      setHint(tc("saving"));
      timer.current = setTimeout(async () => {
        const res = await saveWeeklyDraft({ enrollmentId, week, content: next });
        if ("error" in res) {
          setHint("");
          if (res.error !== "not-draft") toast.error(res.error);
        } else {
          setReport(res.data);
          setHint(tc("saved") + " ✓");
          setTimeout(() => setHint(""), 1500);
        }
      }, 800);
    },
    [editable, enrollmentId, week, tc],
  );

  function update<K extends keyof WeeklyContent>(key: K, value: WeeklyContent[K]) {
    const next = { ...content, [key]: value };
    setContent(next);
    autoSave(next);
  }

  async function onSubmit() {
    if (!content.topic.trim()) {
      setTopicNudge(true);
      if (!window.confirm(t("submitWithoutTopic"))) return;
    }
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    const res = await submitWeekly({ enrollmentId, week, content });
    setBusy(false);
    if ("error" in res) return toast.error(res.error === "locked" ? t("lockedError") : res.error);
    setReport(res.data);
    toast.success(t("submitted"));
    router.refresh();
  }

  async function onRecall() {
    if (!report || !window.confirm(t("recallConfirm"))) return;
    setBusy(true);
    const res = await recallReport(report.id);
    setBusy(false);
    if ("error" in res) return toast.error(res.error === "locked" ? t("recallLocked") : res.error);
    setReport(res.data);
    router.refresh();
  }

  const nav = (dir: -1 | 1) => `/reports/weekly/${enrollmentId}/${Math.min(totalWeeks, Math.max(1, week + dir))}`;

  return (
    <div className="space-y-5">
      {/* Week bar */}
      <div className="no-print flex flex-wrap items-center gap-3 rounded-xl border bg-white px-4 py-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" nativeButton={false} render={<Link href={nav(-1)} aria-disabled={week <= 1} />} disabled={week <= 1}>
            <ChevronLeft />
          </Button>
          <div className="min-w-24 text-center">
            <div className="text-base font-bold text-brand-navy">{tc("weekN", { n: week })}</div>
            <div className="text-[11px] text-muted-foreground">{weekLabel}</div>
          </div>
          <Button variant="outline" size="icon-sm" nativeButton={false} render={<Link href={nav(1)} />} disabled={week >= totalWeeks}>
            <ChevronRight />
          </Button>
        </div>
        <Input
          value={content.topic}
          onChange={(e) => { setTopicNudge(false); update("topic", e.target.value); }}
          disabled={!editable}
          placeholder={t("topicPlaceholder")}
          className={cn("min-w-48 flex-1", topicNudge && "border-status-draft bg-orange-50")}
        />
        <span className="text-xs text-muted-foreground">{hint}</span>
        <StatusBadge status={status} />
      </div>

      {status === "completed" && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm text-status-completed">
          <Lock className="size-4" />
          <div><span className="font-semibold">{t("completedBanner")}</span> · {t("completedBannerSub")}</div>
        </div>
      )}

      <Section num="01" title={t("s1Title")} hint={t("s1Hint")}>
        <Textarea rows={7} value={content.learned} onChange={(e) => update("learned", e.target.value)} disabled={!editable} placeholder={t("s1Placeholder")} />
      </Section>

      <Section num="02" title={t("s2Title")} hint={t("s2Hint")}>
        <div className="mb-3 flex flex-wrap gap-2">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={!editable}
              onClick={() => update("rating", content.rating === r ? "" : r)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                content.rating === r ? "border-brand-navy bg-brand-navy text-white" : "border-border bg-white text-muted-foreground hover:border-brand-navy/40",
              )}
            >
              {t(`rating.${r}`)}
            </button>
          ))}
        </div>
        <Textarea rows={5} value={content.feeling} onChange={(e) => update("feeling", e.target.value)} disabled={!editable} placeholder={t("s2Placeholder")} />
      </Section>

      <Section num="03" title={t("s3Title")} hint={t("s3Hint")} accent="orange">
        <Textarea rows={6} value={content.questions} onChange={(e) => update("questions", e.target.value)} disabled={!editable} placeholder={t("s3Placeholder")} />
      </Section>

      {/* Trainee actions */}
      {canEdit && !locked && (
        <div className="no-print flex flex-col items-center gap-2 py-2">
          <Button size="lg" className="px-10 shadow-md" onClick={onSubmit} disabled={busy}>
            {busy ? t("submitting") : t("submit")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("autosaveHint")}</span>
        </div>
      )}
      {canEdit && status === "submitted" && (
        <div className="no-print flex flex-col items-center gap-1 py-2">
          <Button variant="outline" onClick={onRecall} disabled={busy}>
            <RotateCcw />
            {t("recall")}
          </Button>
          <span className="text-[11px] text-muted-foreground">{t("recallHint")}</span>
        </div>
      )}

      {/* Review — mentor edits when submitted; trainee & others read */}
      {report && locked && (
        <ReviewPanel report={report} canReview={canReview} reviewerName={reviewerName} onChange={setReport} />
      )}
      {!report && isTrainee && !canEdit && (
        <p className="text-center text-sm text-muted-foreground">{t("noReportYet")}</p>
      )}

      {report && status === "completed" && (
        <div className="no-print text-center">
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`/reports/weekly/${enrollmentId}/${week}/print`} target="_blank" rel="noreferrer" />}>
            <Printer />
            {tc("print")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function Section({ num, title, hint, accent = "navy", children }: { num: string; title: string; hint?: string; accent?: "navy" | "orange" | "gray"; children: React.ReactNode }) {
  const bg = accent === "orange" ? "bg-tile-orange" : accent === "gray" ? "bg-neutral-600" : "bg-brand-navy";
  const fg = accent === "orange" ? "text-tile-orange" : accent === "gray" ? "text-neutral-600" : "text-brand-navy";
  return (
    <section className="rounded-xl border bg-white p-6">
      <div className="mb-3 flex items-center gap-3">
        <span className={cn("flex size-8 items-center justify-center rounded-full text-xs font-bold text-white", bg)}>{num}</span>
        <h3 className={cn("text-base font-bold", fg)}>{title}</h3>
      </div>
      {hint && <p className="mb-3 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}
