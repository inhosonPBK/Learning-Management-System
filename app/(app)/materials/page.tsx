import { getLocale, getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { Container, PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/db";

const TILE = ["bg-tile-green", "bg-tile-blue", "bg-tile-orange", "bg-tile-amber", "bg-brand-blue-dark", "bg-brand-navy"];

/** Phase 2 stub: category tiles (DAM "Literature & Training" style) with a coming-soon note. */
export default async function MaterialsPage() {
  await requireViewer();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("materials");
  const { data } = await createAdminClient().from("material_categories").select("*").eq("is_active", true).order("sort_order");
  const categories = (data ?? []) as { code: string; name_ko: string; name_en: string }[];

  return (
    <Container size="xl">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="mb-6 rounded-xl border border-dashed border-brand-gold bg-amber-50 px-5 py-4 text-sm text-amber-900">{t("comingSoon")}</div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {categories.map((c, i) => (
          <div key={c.code} className={cn("relative flex h-36 items-end overflow-hidden rounded-xl p-5 text-white opacity-80", TILE[i % TILE.length])}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,.12),transparent_40%)]" />
            <div className="relative">
              <div className="text-lg font-bold leading-tight">{locale === "ko" ? c.name_ko : c.name_en}</div>
              <div className="text-xs text-white/75">{locale === "ko" ? c.name_en : c.name_ko}</div>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
