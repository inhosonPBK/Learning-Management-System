import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { summarizeGroup, type ProgramGroup } from "@/components/reports/program-groups";
import { cn } from "@/lib/utils";

const TYPE_COLOR = { intern: "bg-tile-green", new_hire: "bg-tile-blue", ojt: "bg-tile-amber" } as const;

/** Compact per-program table for oversight dashboards; finished programs collapsed in <details>. */
export async function ProgramOverview({ groups }: { groups: ProgramGroup[] }) {
  const t = await getTranslations("reports");
  const tp = await getTranslations("programs");
  const td = await getTranslations("dashboard");
  const typeLabel = { intern: tp("typeIntern"), new_hire: tp("typeNewHire"), ojt: tp("typeOjt") } as const;
  const active = groups.filter((g) => g.status === "active");
  const finished = groups.filter((g) => g.status !== "active");

  const Row = ({ g }: { g: ProgramGroup }) => {
    const s = summarizeGroup(g.cards);
    return (
      <li>
        <Link href={`/reports?program=${g.id}`} className="grid grid-cols-[6px_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-muted/40 sm:grid-cols-[6px_1fr_repeat(4,minmax(60px,auto))_20px]">
          <span className={cn("h-9 w-1.5 rounded-full", TYPE_COLOR[g.type])} aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-brand-navy">{g.name}</span>
              <Badge variant="outline" className="text-[10px]">{typeLabel[g.type]}</Badge>
              <StatusBadge status={g.status} />
            </div>
            <div className="text-xs text-muted-foreground">{g.period}</div>
          </div>
          <Cell label={t("groupTrainees")} value={`${s.active}/${s.total}`} />
          <Cell label={t("groupProgress")} value={`${s.progress}%`} bar={s.progress} />
          <Cell label={t("pendingShort")} value={String(s.pending)} highlight={s.pending > 0} />
          <Cell label={t("interview")} value={String(s.interviews)} />
          <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {active.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-white">{active.map((g) => <Row key={g.id} g={g} />)}</ul>
      ) : (
        <p className="rounded-xl border border-dashed bg-white px-4 py-6 text-center text-sm text-muted-foreground">{td("noActivePrograms")}</p>
      )}
      {finished.length > 0 && (
        <details className="group overflow-hidden rounded-xl border bg-white">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/40">
            <Users className="size-4" />{td("finishedPrograms", { count: finished.length })}
            <span className="ml-auto text-xs group-open:hidden">▸</span><span className="ml-auto hidden text-xs group-open:inline">▾</span>
          </summary>
          <ul className="divide-y border-t">{finished.map((g) => <Row key={g.id} g={g} />)}</ul>
        </details>
      )}
    </div>
  );
}

function Cell({ label, value, bar, highlight }: { label: string; value: string; bar?: number; highlight?: boolean }) {
  return (
    <div className="hidden text-center sm:block">
      <div className={cn("text-sm font-bold tabular-nums", highlight ? "text-status-draft" : "text-brand-navy")}>{value}</div>
      {bar !== undefined ? (
        <div className="mx-auto mt-1 h-1 w-14 overflow-hidden rounded bg-neutral-200"><div className="h-full bg-status-completed" style={{ width: `${bar}%` }} /></div>
      ) : (
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      )}
    </div>
  );
}
