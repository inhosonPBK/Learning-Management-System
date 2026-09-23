import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { X } from "lucide-react";
import { requireStaff } from "@/lib/auth/viewer";
import { getEnrollmentsForProgram, getProgram, getReportTypes, programLabel } from "@/lib/data/programs";
import { getAllProfiles } from "@/lib/data/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/weeks";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm } from "@/components/forms/action-form";
import { Field } from "../../users/profile-fields";
import { ProgramFields } from "../program-fields";
import { planToText } from "@/lib/reports/plan";
import { addWatcher, enrollTrainee, removeWatcher, updateEnrollment, updateProgram } from "../actions";
import type { EnrollmentWatcher, Locale } from "@/types/db";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();

  const t = await getTranslations("programs");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const locale = (await getLocale()) as Locale;
  const [reportTypes, enrollments, profiles] = await Promise.all([getReportTypes(), getEnrollmentsForProgram(id), getAllProfiles()]);
  const active = profiles.filter((p) => p.is_active);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const enrolledIds = new Set(enrollments.map((e) => e.trainee_id));
  const { data: watcherRows } = enrollments.length
    ? await createAdminClient().from("enrollment_watchers").select("*").in("enrollment_id", enrollments.map((e) => e.id))
    : { data: [] as EnrollmentWatcher[] };
  const watchers = (watcherRows ?? []) as EnrollmentWatcher[];

  return (
    <>
      <PageHeader
        title={programLabel(program, locale)}
        description={<span className="flex items-center gap-2"><StatusBadge status={program.status} /> {formatDate(program.start_date, locale)} – {formatDate(program.end_date, locale)} · {program.duration_weeks}w</span>}
        back={{ href: "/admin/programs", label: t("title") }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <SectionHeading title={t("programSettings")} />
            <ActionForm action={updateProgram.bind(null, id)} submitLabel={tc("save")} successMessage={tc("saved")}>
              <ProgramFields program={program} reportTypes={reportTypes} locale={locale} />
            </ActionForm>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <SectionHeading title={t("enrollments")} description={t("enrollmentsHint")} />
          {enrollments.map((e) => {
            const trainee = byId.get(e.trainee_id);
            const ws = watchers.filter((w) => w.enrollment_id === e.id);
            return (
              <Card key={e.id}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link href={`/trainees/${e.id}`} className="text-base font-semibold text-brand-blue hover:underline">{trainee?.display_name ?? "—"}</Link>
                      <div className="text-xs text-muted-foreground">{trainee?.job_title} · {trainee?.email}</div>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <ActionForm action={updateEnrollment.bind(null, e.id)} submitLabel={tc("save")} successMessage={tc("saved")}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={tc("mentor")}>
                        <NativeSelect name="mentor_id" defaultValue={e.mentor_id ?? ""}>
                          <option value="">—</option>
                          {active.filter((p) => p.id !== e.trainee_id).map((p) => <option key={p.id} value={p.id}>{p.display_name} · {p.job_title ?? ""}</option>)}
                        </NativeSelect>
                      </Field>
                      <Field label={tc("status")}>
                        <NativeSelect name="status" defaultValue={e.status}>
                          {(["active", "completed", "withdrawn"] as const).map((s) => <option key={s} value={s}>{ts(s)}</option>)}
                        </NativeSelect>
                      </Field>
                      <Field label={t("startOverride")}><Input name="start_date" type="date" defaultValue={e.start_date ?? ""} /></Field>
                      <Field label={t("endOverride")}><Input name="end_date" type="date" defaultValue={e.end_date ?? ""} /></Field>
                      <Field label={t("jd")} className="sm:col-span-2"><Textarea name="jd_text" rows={3} defaultValue={e.jd_text ?? ""} /></Field>
                      <Field label={t("plan")} hint={t("planHint")} className="sm:col-span-2"><Textarea name="training_plan" rows={4} defaultValue={planToText(e.training_plan)} className="font-mono text-xs" /></Field>
                    </div>
                  </ActionForm>

                  <div className="mt-5 border-t pt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("watchers")}</div>
                    <ul className="mb-3 flex flex-wrap gap-2">
                      {ws.map((w) => (
                        <li key={w.profile_id} className="flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs">
                          {byId.get(w.profile_id)?.display_name} · {w.role === "co_mentor" ? t("coMentor") : t("observer")}
                          <form action={removeWatcher.bind(null, e.id, w.profile_id)}>
                            <button type="submit" className="ml-1 text-muted-foreground hover:text-destructive" aria-label={tc("delete")}><X className="size-3" /></button>
                          </form>
                        </li>
                      ))}
                      {!ws.length && <li className="text-xs text-muted-foreground">{tc("none")}</li>}
                    </ul>
                    <ActionForm action={addWatcher.bind(null, e.id)} submitLabel={t("addWatcher")} className="flex flex-wrap items-end gap-2" resetOnSuccess>
                      <NativeSelect name="profile_id" className="w-56" defaultValue="">
                        <option value="">—</option>
                        {active.filter((p) => p.id !== e.trainee_id).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                      </NativeSelect>
                      <NativeSelect name="role" className="w-36" defaultValue="observer">
                        <option value="observer">{t("observer")}</option>
                        <option value="co_mentor">{t("coMentor")}</option>
                      </NativeSelect>
                    </ActionForm>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!enrollments.length && <p className="text-sm text-muted-foreground">{t("noEnrollments")}</p>}
        </div>

        <Card className="self-start">
          <CardContent className="pt-6">
            <SectionHeading title={t("enroll")} />
            <ActionForm action={enrollTrainee.bind(null, id)} submitLabel={t("enroll")} successMessage={t("enrolled")} resetOnSuccess>
              <Field label={tc("trainee")}>
                <NativeSelect name="trainee_id" required defaultValue="">
                  <option value="">—</option>
                  {active.filter((p) => !enrolledIds.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.display_name} · {p.job_title ?? ""}</option>)}
                </NativeSelect>
              </Field>
              <Field label={tc("mentor")}>
                <NativeSelect name="mentor_id" defaultValue="">
                  <option value="">—</option>
                  {active.map((p) => <option key={p.id} value={p.id}>{p.display_name} · {p.job_title ?? ""}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t("jd")}><Textarea name="jd_text" rows={3} /></Field>
              <Field label={t("plan")} hint={t("planHint")}><Textarea name="training_plan" rows={3} className="font-mono text-xs" placeholder={"1-2 | 온보딩 & 안전교육 | OJT | 멘토\n3-6 | 생산 공정 실습 | 실습"} /></Field>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/programs" />}>{tc("back")}</Button>
      </div>
    </>
  );
}
