import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth/viewer";
import { getPrograms, getReportTypes, programLabel } from "@/lib/data/programs";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/weeks";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ActionForm } from "@/components/forms/action-form";
import { ProgramFields } from "./program-fields";
import { createProgram } from "./actions";
import type { Locale } from "@/types/db";

export default async function ProgramsPage() {
  await requireStaff();
  const t = await getTranslations("programs");
  const locale = (await getLocale()) as Locale;
  const [programs, reportTypes] = await Promise.all([getPrograms(), getReportTypes()]);
  const { data: counts } = await createAdminClient().from("enrollments").select("program_id, status");
  const countFor = (id: string) => (counts ?? []).filter((c) => c.program_id === id && c.status === "active").length;

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("program")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("period")}</TableHead>
                  <TableHead className="text-right">{t("trainees")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/admin/programs/${p.id}`} className="font-medium text-brand-blue hover:underline">{programLabel(p, locale)}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{t(`type${p.program_type === "intern" ? "Intern" : p.program_type === "new_hire" ? "NewHire" : "Ojt"}`)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(p.start_date, locale)} – {formatDate(p.end_date, locale)}
                      <div>{p.duration_weeks}w</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{countFor(p.id)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
                {!programs.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t("empty")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <SectionHeading title={t("newProgram")} />
            <ActionForm action={createProgram} submitLabel={t("create")}>
              <ProgramFields reportTypes={reportTypes} locale={locale} />
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
