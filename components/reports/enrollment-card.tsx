import Link from "next/link";
import { FileText, MessageSquareText, Paperclip, Printer } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { EnrollmentStats } from "@/lib/data/reports";

export interface EnrollmentCardData {
  enrollmentId: string;
  traineeName: string;
  traineeAvatarUrl: string | null;
  traineeTitle: string | null;
  teamName: string | null;
  teamCode: string | null;
  programName: string;
  programId: string;
  programType: "intern" | "new_hire" | "ojt";
  programStatus: "planned" | "active" | "closed";
  programStart: string;
  programEnd: string;
  mentorName: string | null;
  currentWeek: number;
  totalWeeks: number;
  stats: EnrollmentStats;
  status: "active" | "completed" | "withdrawn";
  enabledTypes: string[];
  docsCount: number;
}

export function EnrollmentCard({ d, labels, showPrint }: { d: EnrollmentCardData; labels: { weekly: string; interview: string; mentor: string; pending: string; week: string; print: string; docs: string }; showPrint: boolean }) {
  const pct = Math.round((d.stats.weeklyCompleted / Math.max(1, d.totalWeeks)) * 100);
  return (
    <div className="flex flex-col rounded-xl border bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <UserAvatar name={d.traineeName} src={d.traineeAvatarUrl} className="size-10" />
        <div className="min-w-0 flex-1">
          <Link href={`/trainees/${d.enrollmentId}`} className="block truncate text-base font-semibold text-brand-navy hover:underline">{d.traineeName}</Link>
          <div className="truncate text-xs text-muted-foreground">{[d.traineeTitle, d.teamName].filter(Boolean).join(" · ")}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{d.programName}{d.mentorName ? ` · ${labels.mentor}: ${d.mentorName}` : ""}</div>
        </div>
        {d.status !== "active" && <StatusBadge status={d.status} />}
        {d.stats.pendingReview > 0 && <Badge className="bg-brand-yellow text-brand-navy-deep">{labels.pending} {d.stats.pendingReview}</Badge>}
      </div>

      {/* week strip */}
      <div className="mt-4 flex gap-0.5">
        {Array.from({ length: d.totalWeeks }, (_, i) => i + 1).map((w) => (
          <span
            key={w}
            className={cn(
              "h-2 flex-1 rounded-sm",
              w <= d.stats.weeklyCompleted ? "bg-status-completed" : w === d.currentWeek ? "bg-brand-yellow" : "bg-neutral-200",
            )}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{labels.week} {d.currentWeek}/{d.totalWeeks}</span>
        <span>{pct}%</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {d.enabledTypes.includes("weekly") && (
          <Link href={`/reports/weekly/${d.enrollmentId}`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium hover:bg-muted">
            <FileText className="size-3.5" />{labels.weekly} <span className="text-muted-foreground">{d.stats.weeklySubmitted}</span>
          </Link>
        )}
        {d.enabledTypes.includes("interview") && (
          <Link href={`/reports/interview/${d.enrollmentId}`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium hover:bg-muted">
            <MessageSquareText className="size-3.5" />{labels.interview} <span className="text-muted-foreground">{d.stats.interviews}</span>
          </Link>
        )}
        {d.docsCount > 0 && (
          <Link href={`/trainees/${d.enrollmentId}#documents`} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gold/50 bg-amber-50 px-2.5 py-1.5 font-medium text-amber-900 hover:bg-amber-100">
            <Paperclip className="size-3.5" />{labels.docs} <span className="text-amber-700">{d.docsCount}</span>
          </Link>
        )}
        {showPrint && d.enabledTypes.includes("interview") && (
          <a href={`/reports/interview/${d.enrollmentId}/print`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium hover:bg-muted">
            <Printer className="size-3.5" />{labels.print}
          </a>
        )}
      </div>
    </div>
  );
}
