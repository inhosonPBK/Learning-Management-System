import type { EnrollmentCardData } from "@/components/reports/enrollment-card";
import { formatDate } from "@/lib/weeks";

export interface ProgramGroup {
  id: string;
  name: string;
  type: "intern" | "new_hire" | "ojt";
  status: "planned" | "active" | "closed";
  period: string;
  cards: EnrollmentCardData[];
}

/** Per-program roll-up used by the hub accordion headers and the dashboard table. */
export function summarizeGroup(cards: EnrollmentCardData[]) {
  const active = cards.filter((c) => c.status === "active").length;
  const pending = cards.reduce((a, c) => a + c.stats.pendingReview, 0);
  const interviews = cards.reduce((a, c) => a + c.stats.interviews, 0);
  const progress = cards.length ? Math.round((cards.reduce((a, c) => a + c.stats.weeklyCompleted / Math.max(1, c.totalWeeks), 0) / cards.length) * 100) : 0;
  return { total: cards.length, active, pending, interviews, progress };
}

/** Group enrollment cards by program: active programs first, then by most recent start. */
export function groupByProgram(cards: EnrollmentCardData[], locale: "ko" | "en"): ProgramGroup[] {
  const map = new Map<string, ProgramGroup>();
  for (const c of cards) {
    const g = map.get(c.programId) ?? {
      id: c.programId,
      name: c.programName,
      type: c.programType,
      status: c.programStatus,
      period: `${formatDate(c.programStart, locale)} – ${formatDate(c.programEnd, locale)}`,
      cards: [],
    };
    g.cards.push(c);
    map.set(c.programId, g);
  }
  const order = { active: 0, planned: 1, closed: 2 } as const;
  return [...map.values()]
    .map((g) => ({ ...g, cards: g.cards.sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || a.traineeName.localeCompare(b.traineeName)) }))
    .sort((a, b) => order[a.status] - order[b.status] || (b.cards[0]?.programStart ?? "").localeCompare(a.cards[0]?.programStart ?? ""));
}
