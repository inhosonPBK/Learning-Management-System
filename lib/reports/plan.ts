import type { TrainingPlanItem } from "@/types/db";

/** Plain-text plan lines "1-2 | topic | method | owner" → jsonb items. */
export function parsePlan(text: string): TrainingPlanItem[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [range = "", topic = "", method = "", owner = ""] = line.split("|").map((s) => s.trim());
      const [a, b] = range.split(/[-–~]/).map((s) => parseInt(s, 10));
      const from = Number.isFinite(a) ? a : 1;
      const to = Number.isFinite(b) ? b : from;
      return { week_from: from, week_to: Math.max(from, to), topic, method: method || undefined, owner: owner || undefined };
    })
    .filter((i) => i.topic);
}

export function planToText(items: TrainingPlanItem[] | null | undefined) {
  return (items ?? [])
    .map((i) =>
      [i.week_from === i.week_to ? `${i.week_from}` : `${i.week_from}-${i.week_to}`, i.topic, i.method ?? "", i.owner ?? ""]
        .join(" | ")
        .replace(/( \| )+$/, ""),
    )
    .join("\n");
}
