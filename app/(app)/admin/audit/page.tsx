import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfilesMap } from "@/lib/data/org";
import { formatDateTime } from "@/lib/weeks";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLog, Locale } from "@/types/db";

export default async function AuditPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const locale = (await getLocale()) as Locale;
  const { data } = await createAdminClient().from("audit_log").select("*").order("id", { ascending: false }).limit(200);
  const rows = (data ?? []) as AuditLog[];
  const actors = await getProfilesMap(rows.map((r) => r.actor_id ?? ""));

  return (
    <>
      <PageHeader title={t("audit")} description={t("auditSub")} />
      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("when")}</TableHead>
              <TableHead>{t("actor")}</TableHead>
              <TableHead>{t("action")}</TableHead>
              <TableHead>{t("entity2")}</TableHead>
              <TableHead>{t("detail")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.created_at, locale)}</TableCell>
                <TableCell className="text-sm">{r.actor_id ? actors.get(r.actor_id)?.display_name ?? "—" : "system"}</TableCell>
                <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.entity_type}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</TableCell>
                <TableCell className="max-w-md truncate text-xs text-muted-foreground">{r.detail ? JSON.stringify(r.detail) : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
