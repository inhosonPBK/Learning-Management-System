import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Paperclip, Plus, Eye } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { canCreateMaterial } from "@/lib/auth/permissions";
import { categoryLabel, getMaterialCategories, listMaterials } from "@/lib/data/materials";
import { getAttachmentsForOwners } from "@/lib/files/data";
import { getProfilesMap } from "@/lib/data/org";
import { getHubData } from "@/lib/data/hub";
import { AttachmentList } from "@/components/files/attachment-list";
import { SectionHeading } from "@/components/page-header";
import { formatDate } from "@/lib/weeks";
import { Container, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/db";

const TILE = ["bg-tile-green", "bg-tile-blue", "bg-tile-orange", "bg-tile-amber", "bg-brand-blue-dark", "bg-brand-navy"];

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const viewer = await requireViewer();
  const { category = "", q = "" } = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("materials");
  const tc = await getTranslations("common");
  const tp = await getTranslations("programs");

  const [categories, materials] = await Promise.all([
    getMaterialCategories(),
    listMaterials({ category: category || undefined, q: q.trim() || undefined, includeDraftsBy: viewer.id, includeAllDrafts: viewer.isAdmin || viewer.isPeopleOps }),
  ]);
  const [files, authors, hub] = await Promise.all([
    getAttachmentsForOwners("material", materials.map((m) => m.id)),
    getProfilesMap(materials.map((m) => m.author_id ?? "")),
    getHubData(viewer, locale),
  ]);
  // Enrollment documents (training plans, JDs) the viewer is entitled to see — grouped by trainee.
  const enrollmentDocs = await getAttachmentsForOwners("enrollment", hub.visibleEnrollmentIds);
  const cardById = new Map([...hub.mine, ...hub.mentees, ...hub.team, ...hub.all].map((c) => [c.enrollmentId, c]));
  const docGroups = [...new Set(enrollmentDocs.map((d) => d.owner_id))].map((eid) => ({ card: cardById.get(eid), docs: enrollmentDocs.filter((d) => d.owner_id === eid) })).filter((g) => g.card);
  const docKindLabels = { training_plan: tp("docTrainingPlan"), jd: tp("docJd"), other: tp("docOther") };
  const catMap = new Map(categories.map((c) => [c.code, c]));
  const countBy = (code: string) => materials.filter((m) => m.category_code === code && m.is_published).length;
  const typeLabel: Record<string, string> = { intern: tp("typeIntern"), new_hire: tp("typeNewHire"), ojt: tp("typeOjt") };

  return (
    <Container size="xl">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={canCreateMaterial(viewer) ? <Button nativeButton={false} render={<Link href="/materials/new" />}><Plus />{t("newMaterial")}</Button> : undefined}
      />

      {docGroups.length > 0 && !category && !q && (
        <section className="mb-8">
          <SectionHeading title={t("enrollmentDocs")} description={t("enrollmentDocsHint")} />
          <div className="grid gap-4 md:grid-cols-2">
            {docGroups.map(({ card, docs }) => (
              <div key={card!.enrollmentId} className="rounded-xl border bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Link href={`/trainees/${card!.enrollmentId}#documents`} className="text-sm font-semibold text-brand-navy hover:underline">{card!.traineeName}</Link>
                  <span className="text-xs text-muted-foreground">{card!.programName}</span>
                </div>
                <AttachmentList attachments={docs} canManage={false} locale={locale} kindLabels={docKindLabels} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category tiles (DAM-style) */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {categories.map((c, i) => {
          const active = category === c.code;
          return (
            <Link
              key={c.code}
              href={active ? "/materials" : `/materials?category=${c.code}`}
              className={cn("relative flex h-24 items-end overflow-hidden rounded-xl p-3 text-white shadow-sm transition-all hover:shadow-md", TILE[i % TILE.length], active && "ring-2 ring-brand-yellow ring-offset-2")}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.18),transparent_45%)]" />
              <div className="relative">
                <div className="text-sm font-bold leading-tight">{categoryLabel(c, locale)}</div>
                <div className="text-[11px] text-white/75">{countBy(c.code)} {t("items")}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="max-w-xs" />
        <Button type="submit" variant="outline" size="sm">{tc("search")}</Button>
        {(q || category) && <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/materials" />}>{tc("all")}</Button>}
      </form>

      {!materials.length ? (
        <div className="rounded-xl border border-dashed bg-white p-12 text-center text-sm text-muted-foreground">{t("empty")}</div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-white">
          {materials.map((m) => {
            const n = files.filter((f) => f.owner_id === m.id).length;
            return (
              <li key={m.id}>
                <Link href={`/materials/${m.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40">
                  <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">{categoryLabel(catMap.get(m.category_code), locale)}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-brand-navy">{m.title}</span>
                      {!m.is_published && <Badge variant="outline" className="text-status-draft">{t("draft")}</Badge>}
                      {m.program_types?.map((pt) => <Badge key={pt} variant="outline" className="text-[10px] text-muted-foreground">{typeLabel[pt]}</Badge>)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {authors.get(m.author_id ?? "")?.display_name} · {formatDate(m.published_at ?? m.updated_at, locale)}
                      {m.body ? ` · ${m.body.replace(/\s+/g, " ").slice(0, 80)}` : ""}
                    </div>
                  </div>
                  {n > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="size-3.5" />{n}</span>}
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex"><Eye className="size-3.5" />{m.view_count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
