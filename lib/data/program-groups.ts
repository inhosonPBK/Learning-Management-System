import type { EnrollmentCardData } from "@/components/reports/enrollment-card";
import type { ProgramGroup } from "@/components/reports/program-groups";
import { formatDate } from "@/lib/weeks";

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
