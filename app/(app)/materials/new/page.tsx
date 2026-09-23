import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { canCreateMaterial } from "@/lib/auth/permissions";
import { getMaterialCategories } from "@/lib/data/materials";
import { Container, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ActionForm } from "@/components/forms/action-form";
import { MaterialFields } from "../material-fields";
import { createMaterial } from "../actions";
import type { Locale } from "@/types/db";

export default async function NewMaterialPage() {
  const viewer = await requireViewer();
  if (!canCreateMaterial(viewer)) redirect("/materials");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("materials");
  const categories = await getMaterialCategories();

  return (
    <Container>
      <PageHeader title={t("newMaterial")} description={t("newMaterialHint")} back={{ href: "/materials", label: t("title") }} />
      <Card>
        <CardContent className="pt-6">
          <ActionForm action={createMaterial} submitLabel={t("create")}>
            <MaterialFields categories={categories} locale={locale} />
          </ActionForm>
        </CardContent>
      </Card>
    </Container>
  );
}
