import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, ClipboardCheck, FileText, Settings2, Users } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { getHubData } from "@/lib/data/hub";
import { getTodos } from "@/lib/data/todos";
import { TodoList } from "@/components/dashboard/todo-list";
import { ProgramOverview } from "@/components/dashboard/program-overview";
import { groupByProgram } from "@/lib/data/program-groups";
import { getProfilesMap } from "@/lib/data/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/weeks";
import { Container, SectionHeading } from "@/components/page-header";
import { EnrollmentCard, type EnrollmentCardData } from "@/components/reports/enrollment-card";
import type { Locale } from "@/types/db";

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard");
  const tr = await getTranslations("reports");
  const tn = await getTranslations("nav");
  const tc = await getTranslations("common");
  const [hub, todos] = await Promise.all([getHubData(viewer, locale), getTodos(viewer)]);
  const oversight = viewer.isAdmin || viewer.isPeopleOps || viewer.isGm;
  const staff = viewer.isAdmin || viewer.isPeopleOps;

  // "What's new": announcements only — recently published materials and newly opened programs.
  const admin = createAdminClient();
  const [{ data: newMaterials }, { data: newPrograms }] = await Promise.all([
    admin.from("training_materials").select("id, title, author_id, published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(5),
    admin.from("programs").select("id, name_ko, name_en, created_at").in("status", ["planned", "active"]).order("created_at", { ascending: false }).limit(3),
  ]);
  type NewsItem = { key: string; kind: "material" | "program"; href: string; title: string; who: string | null; at: string | null };
  const news: NewsItem[] = [
    ...((newMaterials ?? []) as { id: string; title: string; author_id: string | null; published_at: string | null }[]).map((m) => ({ key: `m-${m.id}`, kind: "material" as const, href: `/materials/${m.id}`, title: m.title, who: m.author_id, at: m.published_at })),
    ...((newPrograms ?? []) as { id: string; name_ko: string; name_en: string; created_at: string }[]).map((p) => ({ key: `p-${p.id}`, kind: "program" as const, href: `/reports?program=${p.id}`, title: locale === "ko" ? p.name_ko : p.name_en, who: null, at: p.created_at })),
  ].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "")).slice(0, 6);
  const actors = await getProfilesMap(news.map((n) => n.who ?? ""));

  const labels = { weekly: tr("weekly"), interview: tr("interview"), mentor: tc("mentor"), pending: tr("pendingShort"), week: tc("week"), print: tr("printLog"), docs: tr("documents") };
  const pendingCount = todos.filter((x) => x.kind === "review").length;

  const quick = [
    { href: "/reports", icon: FileText, label: tn("reports"), sub: t("quickReports"), color: "text-brand-blue" },
    { href: "/reports", icon: ClipboardCheck, label: t("pendingReviewsTitle"), sub: pendingCount ? t("pendingReviews", { count: pendingCount }) : t("nothingPending"), color: pendingCount ? "text-status-draft" : "text-status-completed" },
    { href: "/materials", icon: BookOpen, label: tn("materials"), sub: t("quickMaterials"), color: "text-tile-green" },
    { href: "/people", icon: Users, label: tn("people"), sub: t("quickPeople"), color: "text-tile-amber" },
  ];

  const allActive = hub.all.filter((c) => c.status === "active");
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
          {todos.length > 0 && (
            <section>
              <SectionHeading title={t("actionRequired")} description={t("actionRequiredHint", { count: todos.length })} />
              <TodoList todos={todos} />
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
              <SectionHeading title={t("companyOverview")} description={t("companyOverviewHint", { count: allActive.length, finished: hub.all.length - allActive.length })} actions={<MoreLink href="/reports" label={t("viewAll")} />} />
              <OverviewStats cards={allActive.length ? allActive : hub.all} labels={{ trainees: tc("trainee"), reviewed: tr("statCompleted"), pending: tr("statSubmitted"), interviews: tr("interview") }} />
              <div className="mt-4"><ProgramOverview groups={groupByProgram(hub.all, locale)} /></div>
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
            <SectionHeading title={t("news")} description={t("newsHint")} />
            {news.length ? (
              <ul className="space-y-3">
                {news.map((n) => (
                  <li key={n.key}>
                    <Link href={n.href} className="flex gap-3 rounded-lg text-sm hover:bg-muted/40">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.kind === "material" ? "bg-tile-green" : "bg-brand-blue"}`} />
                      <div className="min-w-0">
                        <div className="truncate">
                          <span className="text-xs font-semibold text-muted-foreground">{n.kind === "material" ? t("newsMaterial") : t("newsProgram")}</span>{" "}
                          <span className="font-medium">{n.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{n.who ? `${actors.get(n.who)?.display_name ?? ""} · ` : ""}{formatDateTime(n.at, locale)}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noNews")}</p>
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
