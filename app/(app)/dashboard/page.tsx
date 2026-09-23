import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, ClipboardCheck, FileText, Settings2, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { getHubData } from "@/lib/data/hub";
import { getProfilesMap } from "@/lib/data/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/weeks";
import { Container, SectionHeading } from "@/components/page-header";
import { EnrollmentCard, type EnrollmentCardData } from "@/components/reports/enrollment-card";
import { Badge } from "@/components/ui/badge";
import type { AuditLog, Locale } from "@/types/db";

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard");
  const tr = await getTranslations("reports");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const hub = await getHubData(viewer, locale);
  const oversight = viewer.isAdmin || viewer.isPeopleOps || viewer.isGm;
  const staff = viewer.isAdmin || viewer.isPeopleOps;

  // Recent activity: oversight roles see everything, others see their own actions.
  let audit = createAdminClient().from("audit_log").select("*").order("id", { ascending: false }).limit(8);
  if (!oversight) audit = audit.eq("actor_id", viewer.id);
  const { data: auditRows } = await audit;
  const activity = (auditRows ?? []) as AuditLog[];
  const actors = await getProfilesMap(activity.map((a) => a.actor_id ?? ""));

  const labels = { weekly: tr("weekly"), interview: tr("interview"), mentor: tc("mentor"), pending: tr("pendingShort"), week: tc("week"), print: tr("printLog") };
  const pendingCount = hub.pendingReviews.length;
  const cardByEnrollment = new Map<string, EnrollmentCardData>([...hub.mentees, ...hub.team, ...hub.all].map((c) => [c.enrollmentId, c]));

  const quick = [
    { href: "/reports", icon: FileText, label: tn("reports"), sub: t("quickReports"), color: "text-brand-blue" },
    { href: "/reports", icon: ClipboardCheck, label: t("pendingReviewsTitle"), sub: pendingCount ? t("pendingReviews", { count: pendingCount }) : t("nothingPending"), color: pendingCount ? "text-status-draft" : "text-status-completed" },
    { href: "/materials", icon: BookOpen, label: tn("materials"), sub: tc("comingSoon"), color: "text-tile-green" },
    { href: "/people", icon: Users, label: tn("people"), sub: t("quickPeople"), color: "text-tile-amber" },
  ];

  const nothing = !hub.mine.length && !hub.mentees.length && !hub.team.length && !(oversight && hub.all.length);

  return (
    <Container size="xl">
      {/* Hero strip */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-navy-deep via-brand-navy to-brand-blue-dark px-8 py-8 text-white">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-yellow">Training Hub</div>
        <h1 className="mt-1 text-2xl font-semibold">{t("greeting", { name: viewer.profile.display_name })}</h1>
        <p className="mt-1 text-sm text-white/70">
          {viewer.profile.job_title}{viewer.profile.job_title && " · "}
          {new Date().toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Quick links — promega.com "Helpful Resources" style */}
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.label} href={q.href} className="rounded-xl border bg-white p-4 transition-shadow hover:shadow-md">
              <Icon className={`size-6 ${q.color}`} />
              <div className="mt-3 text-sm font-semibold text-brand-navy">{q.label}</div>
              <div className="text-xs text-muted-foreground">{q.sub}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {(pendingCount > 0 || hub.myDrafts.length > 0) && (
            <section>
              <SectionHeading title={t("actionRequired")} />
              <ul className="divide-y rounded-xl border bg-white">
                {hub.pendingReviews.map((r) => (
                  <li key={r.id}>
                    <Link href={`/reports/weekly/${r.enrollment_id}/${r.period_index}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
                      <Badge className="bg-brand-yellow text-brand-navy-deep">{tr("pendingShort")}</Badge>
                      <span className="font-medium">{cardByEnrollment.get(r.enrollment_id)?.traineeName ?? "—"}</span>
                      <span className="text-muted-foreground">· {tc("weekN", { n: r.period_index ?? 0 })}</span>
                      <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
                {hub.myDrafts.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.report_type === "weekly" ? `/reports/weekly/${r.enrollment_id}/${r.period_index}` : `/reports/interview/${r.enrollment_id}/${r.id}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50"
                    >
                      <Badge variant="outline" className="text-status-draft">{ts("draft")}</Badge>
                      <span className="font-medium">{r.report_type === "weekly" ? tr("weekly") : tr("interview")}</span>
                      {r.period_index && <span className="text-muted-foreground">· {tc("weekN", { n: r.period_index })}</span>}
                      <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hub.mine.length > 0 && (
            <section>
              <SectionHeading title={t("myTraining")} />
              <div className="grid gap-4 md:grid-cols-2">{hub.mine.map((d) => <EnrollmentCard key={d.enrollmentId} d={d} labels={labels} showPrint={false} />)}</div>
            </section>
          )}
          {hub.mentees.length > 0 && (
            <section>
              <SectionHeading title={t("myMentees")} actions={<MoreLink href="/reports" label={t("viewAll")} />} />
              <div className="grid gap-4 md:grid-cols-2">{hub.mentees.slice(0, 4).map((d) => <EnrollmentCard key={d.enrollmentId} d={d} labels={labels} showPrint />)}</div>
            </section>
          )}
          {hub.team.length > 0 && (
            <section>
              <SectionHeading title={t("myTeam")} actions={<MoreLink href="/reports" label={t("viewAll")} />} />
              <div className="grid gap-4 md:grid-cols-2">{hub.team.slice(0, 4).map((d) => <EnrollmentCard key={d.enrollmentId} d={d} labels={labels} showPrint />)}</div>
            </section>
          )}
          {oversight && (
            <section>
              <SectionHeading title={t("companyOverview")} description={t("companyOverviewHint", { count: hub.all.length })} actions={<MoreLink href="/reports" label={t("viewAll")} />} />
              <OverviewStats cards={hub.all} labels={{ trainees: tc("trainee"), reviewed: tr("statCompleted"), pending: tr("statSubmitted"), interviews: tr("interview") }} />
            </section>
          )}
          {nothing && <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-muted-foreground">{t("noTraining")}</div>}
        </div>

        {/* Aside — admin shortcut + DAM-style activity feed */}
        <aside className="space-y-8">
          {staff && (
            <section>
              <SectionHeading title={t("adminTools")} />
              <Link href="/admin" className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-medium hover:bg-muted/50">
                <Settings2 className="size-4 text-brand-navy" />{tn("admin")}
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
            </section>
          )}
          <section>
            <SectionHeading title={t("recentActivity")} />
            {activity.length ? (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-gold" />
                    <div className="min-w-0">
                      <div className="truncate">
                        <span className="font-medium">{a.actor_id ? actors.get(a.actor_id)?.display_name ?? "—" : "system"}</span>{" "}
                        <code className="rounded bg-muted px-1 text-[11px]">{a.action}</code>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(a.created_at, locale)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
            )}
          </section>
        </aside>
      </div>
    </Container>
  );
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="text-sm font-medium text-brand-blue hover:underline">{label} →</Link>;
}

function OverviewStats({ cards, labels }: { cards: EnrollmentCardData[]; labels: { trainees: string; reviewed: string; pending: string; interviews: string } }) {
  const sum = (f: (c: EnrollmentCardData) => number) => cards.reduce((a, c) => a + f(c), 0);
  const items = [
    [labels.trainees, cards.length, "text-brand-navy"],
    [labels.reviewed, sum((c) => c.stats.weeklyCompleted), "text-status-completed"],
    [labels.pending, sum((c) => c.stats.pendingReview), "text-status-submitted"],
    [labels.interviews, sum((c) => c.stats.interviews), "text-tile-green"],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, value, color]) => (
        <div key={label} className="rounded-xl border bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}
