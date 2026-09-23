import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Report } from "@/types/db";

/** Program-length week grid with draft/submitted/completed colouring. */
export function WeekGrid({
  enrollmentId,
  totalWeeks,
  currentWeek,
  reports,
  weekLabel,
  writeLabel,
}: {
  enrollmentId: string;
  totalWeeks: number;
  currentWeek: number;
  reports: Report[];
  weekLabel: (w: number) => string;
  writeLabel: string;
}) {
  const byWeek = new Map(reports.filter((r) => r.report_type === "weekly" && r.period_index).map((r) => [r.period_index!, r]));
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
        const r = byWeek.get(w);
        const s = r?.status;
        const isCurrent = w === currentWeek;
        return (
          <Link
            key={w}
            href={`/reports/weekly/${enrollmentId}/${w}`}
            className={cn(
              "flex min-h-[76px] flex-col justify-between rounded-xl border-[1.5px] p-3 transition-shadow hover:shadow-md",
              s === "completed" && "border-green-300 bg-green-50",
              s === "submitted" && "border-blue-300 bg-blue-50",
              s === "draft" && "border-orange-300 bg-orange-50",
              !s && "border-border bg-white",
              isCurrent && "ring-2 ring-brand-yellow ring-offset-1",
            )}
          >
            <div className="flex items-start justify-between">
              <span className={cn("text-sm font-bold", !s ? "text-neutral-300" : s === "completed" ? "text-status-completed" : s === "submitted" ? "text-status-submitted" : "text-status-draft")}>W{w}</span>
              {s && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", s === "completed" ? "bg-green-100 text-status-completed" : s === "submitted" ? "bg-blue-100 text-status-submitted" : "bg-orange-100 text-status-draft")}>
                  {s === "completed" ? "✓" : s === "submitted" ? "↑" : "…"}
                </span>
              )}
            </div>
            <div className={cn("text-[10px]", !s ? "text-neutral-300" : "text-muted-foreground")}>{weekLabel(w)}</div>
            {!s && <div className="text-[10px] text-neutral-300">+ {writeLabel}</div>}
          </Link>
        );
      })}
    </div>
  );
}
