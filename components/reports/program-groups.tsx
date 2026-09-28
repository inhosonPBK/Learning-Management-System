"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EnrollmentCard } from "./enrollment-card";
import { cn } from "@/lib/utils";

import { summarizeGroup, type ProgramGroup } from "@/lib/data/program-groups";

const TYPE_COLOR = { intern: "bg-tile-green", new_hire: "bg-tile-blue", ojt: "bg-tile-amber" } as const;

/** Collapsible per-program sections for oversight roles: active programs open, finished ones closed. */
export function ProgramGroups({ groups, labels }: { groups: ProgramGroup[]; labels: React.ComponentProps<typeof EnrollmentCard>["labels"] }) {
  const t = useTranslations("reports");
  const tp = useTranslations("programs");
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.filter((g) => g.status === "active").map((g) => g.id)));
  const allOpen = groups.every((g) => open.has(g.id));
  const toggle = (id: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const typeLabel = { intern: tp("typeIntern"), new_hire: tp("typeNewHire"), ojt: tp("typeOjt") } as const;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(new Set(allOpen ? [] : groups.map((g) => g.id)))}>
          {allOpen ? <ChevronRight /> : <ChevronDown />}{allOpen ? t("collapseAll") : t("expandAll")}
        </Button>
      </div>
      {groups.map((g) => {
        const s = summarizeGroup(g.cards);
        const isOpen = open.has(g.id);
        return (
          <section key={g.id} className={cn("overflow-hidden rounded-xl border bg-white", g.status !== "active" && "opacity-90")}>
            <button type="button" onClick={() => toggle(g.id)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/40">
              <span className={cn("hidden h-9 w-1.5 rounded-full sm:block", TYPE_COLOR[g.type])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-brand-navy">{g.name}</span>
                  <Badge variant="outline" className="text-[10px]">{typeLabel[g.type]}</Badge>
                  <StatusBadge status={g.status} />
                </div>
                <div className="text-xs text-muted-foreground">{g.period}</div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center text-xs">
                <Stat label={t("groupTrainees")} value={`${s.active}/${s.total}`} icon={<Users className="size-3" />} />
                <Stat label={t("groupProgress")} value={`${s.progress}%`} />
                <Stat label={t("pendingShort")} value={String(s.pending)} highlight={s.pending > 0} />
                <Stat label={t("interview")} value={String(s.interviews)} />
              </div>
              {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
            </button>
            {isOpen && (
              <div className="border-t bg-surface p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {g.cards.map((d) => <EnrollmentCard key={d.enrollmentId} d={d} labels={labels} showPrint />)}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="min-w-14">
      <div className={cn("flex items-center justify-center gap-1 text-sm font-bold tabular-nums", highlight ? "text-status-draft" : "text-brand-navy")}>{icon}{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
