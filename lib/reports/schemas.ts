import { z } from "zod";

export const RATINGS = ["Excellent", "Good", "Okay", "Tough"] as const;
export const PROGRESS = ["On Track", "Minor Adjustment", "Review Required"] as const;

/** weekly v1 body (ported from the intern app). Drafts may be empty; submit requires nothing extra (topic is nudged in UI). */
export const weeklyContentV1 = z.object({
  topic: z.string().max(200).default(""),
  learned: z.string().max(20000).default(""),
  rating: z.enum([...RATINGS, ""]).default(""),
  feeling: z.string().max(20000).default(""),
  questions: z.string().max(20000).default(""),
});
export type WeeklyContent = z.infer<typeof weeklyContentV1>;

export const weeklyReviewV1 = z.object({
  good: z.string().max(20000).default(""),
  next: z.string().max(20000).default(""),
  qa: z.string().max(20000).default(""),
  progress: z.enum([...PROGRESS, ""]).default(""),
});
export type WeeklyReview = z.infer<typeof weeklyReviewV1>;

/** interview v1 body — single merged field (면담내용 및 청년 건의사항). */
export const interviewContentV1 = z.object({
  content: z.string().max(20000).default(""),
});
export type InterviewContent = z.infer<typeof interviewContentV1>;

export const emptyWeekly: WeeklyContent = { topic: "", learned: "", rating: "", feeling: "", questions: "" };
export const emptyReview: WeeklyReview = { good: "", next: "", qa: "", progress: "" };

export function parseWeekly(v: unknown): WeeklyContent {
  const r = weeklyContentV1.safeParse(v ?? {});
  return r.success ? r.data : emptyWeekly;
}
export function parseReview(v: unknown): WeeklyReview {
  const r = weeklyReviewV1.safeParse(v ?? {});
  return r.success ? r.data : emptyReview;
}
export function parseInterview(v: unknown): InterviewContent {
  const r = interviewContentV1.safeParse(v ?? {});
  return r.success ? r.data : { content: "" };
}
