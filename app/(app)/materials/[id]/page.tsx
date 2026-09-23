import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Eye, Trash2 } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { canManageMaterials } from "@/lib/auth/permissions";
import { categoryLabel, getMaterial, getMaterialCategories } from "@/lib/data/materials";
import { getAttachments } from "@/lib/files/data";
import { getProfileById } from "@/lib/data/org";
import { formatDate } from "@/lib/weeks";
import { Container, PageHeader, SectionHeading } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/forms/action-form";
import { FileUploader } from "@/components/files/file-uploader";
import { AttachmentList } from "@/components/files/attachment-list";
import { MaterialFields } from "../material-fields";
import { bumpViewCount, deleteMaterial, updateMaterial } from "../actions";
import type { Locale } from "@/types/db";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const material = await getMaterial(id);
  if (!material) notFound();
  const manage = canManageMaterials(viewer, material);
  if (!material.is_published && !manage) notFound();

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("materials");
  const tc = await getTranslations("common");
  const tp = await getTranslations("programs");
  const [categories, files, author] = await Promise.all([getMaterialCategories(), getAttachments("material", id), material.author_id ? getProfileById(material.author_id) : null]);
  const category = categories.find((c) => c.code === material.category_code);
  const typeLabel: Record<string, string> = { intern: tp("typeIntern"), new_hire: tp("typeNewHire"), ojt: tp("typeOjt") };
  if (material.is_published && material.author_id !== viewer.id) void bumpViewCount(id);

  return (
    <Container>
      <PageHeader
        title={material.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{categoryLabel(category, locale)}</Badge>
            {material.program_types?.map((pt) => <Badge key={pt} variant="outline" className="text-muted-foreground">{typeLabel[pt]}</Badge>)}
            {!material.is_published && <Badge variant="outline" className="text-status-draft">{t("draft")}</Badge>}
            <span>{author?.display_name} · {formatDate(material.published_at ?? material.updated_at, locale)}</span>
            <span className="flex items-center gap-1 text-xs"><Eye className="size-3.5" />{material.view_count}</span>
          </span>
        }
        back={{ href: "/materials", label: t("title") }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {material.body && (
            <Card>
              <CardContent className="pt-6">
                <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{material.body}</div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <SectionHeading
                title={t("attachments")}
                description={t("attachmentsHint")}
                actions={manage ? <FileUploader ownerType="material" ownerId={id} kinds={[{ value: "file", label: "file" }]} compact /> : undefined}
              />
              <AttachmentList attachments={files} canManage={manage} locale={locale} emptyText={t("noAttachments")} />
            </CardContent>
          </Card>
        </div>

        {manage && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <SectionHeading title={tc("edit")} />
                <ActionForm action={updateMaterial.bind(null, id)} submitLabel={tc("save")} successMessage={tc("saved")}>
                  <MaterialFields material={material} categories={categories} locale={locale} />
                </ActionForm>
              </CardContent>
            </Card>
            <form action={deleteMaterial.bind(null, id)}>
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-destructive hover:bg-red-50">
                <Trash2 className="size-4" />{t("deleteMaterial")}
              </button>
            </form>
          </div>
        )}
      </div>
    </Container>
  );
}
