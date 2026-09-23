import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { X } from "lucide-react";
import { requireStaff } from "@/lib/auth/viewer";
import { getEnrollmentsForProgram, getProgram, getReportTypes, programLabel } from "@/lib/data/programs";
import { getAllProfiles } from "@/lib/data/org";
import { getAttachmentsForOwners } from "@/lib/files/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/weeks";
import { planToText } from "@/lib/reports/plan";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm } from "@/components/forms/action-form";
import { FileUploader } from "@/components/files/file-uploader";
import { AttachmentList } from "@/components/files/attachment-list";
import { Field } from "../../users/profile-fields";
import { ProgramFields } from "../program-fields";
import { addWatcher, deleteProgram, enrollTrainee, removeWatcher, updateEnrollment, updateProgram } from "../actions";
import type { EnrollmentWatcher, Locale } from "@/types/db";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();

  const t = await getTranslations("programs");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const tf = await getTranslations("files");
  const locale = (await getLocale()) as Locale;
  const [reportTypes, enrollments, profiles] = await Promise.all([getReportTypes(), getEnrollmentsForProgram(id), getAllProfiles()]);
  const active = profiles.filter((p) => p.is_active);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const enrolledIds = new Set(enrollments.map((e) => e.trainee_id));
  const enrollmentIds = enrollments.map((e) => e.id);
  const [{ data: watcherRows }, attachments, { count: reportCount }] = await Promise.all([
    enrollmentIds.length ? createAdminClient().from("enrollment_watchers").select("*").in("enrollment_id", enrollmentIds) : Promise.resolve({ data: [] as EnrollmentWatcher[] }),
    getAttachmentsForOwners("enrollment", enrollmentIds),
    enrollmentIds.length
      ? createAdminClient().from("reports").select("id", { count: "exact", head: true }).in("enrollment_id", enrollmentIds)
      : Promise.resolve({ count: 0 }),
  ]);
  const watchers = (watcherRows ?? []) as EnrollmentWatcher[];
  const implicitStaff = active.filter((p) => p.is_people_ops || p.is_gm);

  const docKinds = [
    { value: "training_plan", label: t("docTrainingPlan") },
    { value: "jd", label: t("docJd") },
    { value: "other", label: t("docOther") },
  ];
  const kindLabels = Object.fromEntries(docKinds.map((k) => [k.value, k.label]));

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
            const mentor = e.mentor_id ? byId.get(e.mentor_id) : null;
            const traineeManager = trainee?.manager_id ? byId.get(trainee.manager_id) : null;
            const ws = watchers.filter((w) => w.enrollment_id === e.id);
            const files = attachments.filter((a) => a.owner_id === e.id);
            const implicit = [
              traineeManager && traineeManager.id !== mentor?.id ? { name: traineeManager.display_name, role: tc("manager") } : null,
              ...implicitStaff.filter((p) => p.id !== trainee?.id && p.id !== mentor?.id && p.id !== traineeManager?.id).map((p) => ({ name: p.display_name, role: p.is_gm ? "GM" : "People Ops" })),
            ].filter((x): x is { name: string; role: string } => !!x);

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
                      <Field label={t("jd")} hint={t("jdHint")} className="sm:col-span-2"><Textarea name="jd_text" rows={2} defaultValue={e.jd_text ?? ""} /></Field>
                      <Field label={t("planSummary")} hint={t("planHint")} className="sm:col-span-2"><Textarea name="training_plan" rows={3} defaultValue={planToText(e.training_plan)} className="font-mono text-xs" /></Field>
                    </div>
                  </ActionForm>

                  {/* Documents */}
                  <div className="mt-5 border-t pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("documents")}</div>
                      <FileUploader ownerType="enrollment" ownerId={e.id} kinds={docKinds} compact accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt,.md" />
                    </div>
                    <AttachmentList attachments={files} canManage locale={locale} kindLabels={kindLabels} emptyText={t("noDocuments")} />
                    <p className="mt-1 text-[11px] text-muted-foreground">{tf("hint")}</p>
                  </div>

                  {/* Viewers */}
                  <div className="mt-5 border-t pt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("viewers")}</div>
                    <ul className="mb-2 flex flex-wrap gap-2">
                      {mentor && <li className="rounded-full border border-brand-yellow bg-amber-50 px-2.5 py-1 text-xs">{mentor.display_name} · {tc("mentor")}</li>}
                      {implicit.map((v) => (
                        <li key={v.name + v.role} className="rounded-full border border-dashed bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground" title={t("implicitViewerHint")}>{v.name} · {v.role}</li>
                      ))}
                      {ws.map((w) => (
                        <li key={w.profile_id} className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs">
                          {byId.get(w.profile_id)?.display_name} · {w.role === "co_mentor" ? t("coMentor") : t("observer")}
                          <form action={removeWatcher.bind(null, e.id, w.profile_id)}>
                            <button type="submit" className="ml-1 text-muted-foreground hover:text-destructive" aria-label={tc("delete")}><X className="size-3" /></button>
                          </form>
                        </li>
                      ))}
                    </ul>
                    <p className="mb-3 text-[11px] text-muted-foreground">{t("viewersHint")}</p>
                    <ActionForm action={addWatcher.bind(null, e.id)} submitLabel={t("addWatcher")} className="flex flex-wrap items-end gap-2" resetOnSuccess>
                      <NativeSelect name="profile_id" className="w-56" defaultValue="">
                        <option value="">—</option>
                        {active.filter((p) => p.id !== e.trainee_id && !ws.some((w) => w.profile_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
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
              <Field label={tc("mentor")} hint={t("mentorHint")}>
                <NativeSelect name="mentor_id" defaultValue="">
                  <option value="">—</option>
                  {active.map((p) => <option key={p.id} value={p.id}>{p.display_name} · {p.job_title ?? ""}</option>)}
                </NativeSelect>
              </Field>
              <Field label={t("jd")} hint={t("jdHint")}><Textarea name="jd_text" rows={2} /></Field>
              <Field label={t("planSummary")} hint={t("planHint")}><Textarea name="training_plan" rows={2} className="font-mono text-xs" placeholder={"1-4 | Phase 1 직접 교육\n5-12 | Phase 2 R&D 파견"} /></Field>
              <p className="text-xs text-muted-foreground">{t("enrollDocsHint")}</p>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50/40 px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-destructive">{t("deleteProgram")}</div>
          <p className="text-xs text-muted-foreground">{t("deleteProgramHint", { enrollments: enrollments.length, reports: reportCount ?? 0, files: attachments.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/programs" />}>{tc("back")}</Button>
          <ActionForm
            action={deleteProgram.bind(null, id)}
            submitLabel={t("deleteProgram")}
            variant="destructive"
            confirmMessage={t("deleteProgramConfirm", { name: programLabel(program, locale), enrollments: enrollments.length, reports: reportCount ?? 0 })}
            className="space-y-0"
          />
        </div>
      </div>
    </>
  );
}
