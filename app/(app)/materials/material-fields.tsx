import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "../admin/users/profile-fields";
import { categoryLabel, type Material, type MaterialCategory } from "@/lib/data/materials";

export function MaterialFields({ material, categories, locale }: { material?: Material | null; categories: MaterialCategory[]; locale: "ko" | "en" }) {
  const t = useTranslations("materials");
  const tp = useTranslations("programs");
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label={t("fieldTitle")} className="sm:col-span-2">
        <Input name="title" required maxLength={200} defaultValue={material?.title ?? ""} />
      </Field>
      <Field label={t("fieldCategory")}>
        <NativeSelect name="category_code" required defaultValue={material?.category_code ?? categories[0]?.code ?? ""}>
          {categories.map((c) => <option key={c.code} value={c.code}>{categoryLabel(c, locale)}</option>)}
        </NativeSelect>
      </Field>
      <Field label={t("fieldBody")} hint={t("fieldBodyHint")} className="sm:col-span-3">
        <Textarea name="body" rows={8} defaultValue={material?.body ?? ""} />
      </Field>
      <Field label={t("fieldAudience")} hint={t("fieldAudienceHint")} className="sm:col-span-2">
        <div className="flex flex-wrap gap-3 pt-1">
          {(["intern", "new_hire", "ojt"] as const).map((pt) => (
            <label key={pt} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="program_types" value={pt} defaultChecked={material?.program_types?.includes(pt) ?? false} className="size-4" />
              {pt === "intern" ? tp("typeIntern") : pt === "new_hire" ? tp("typeNewHire") : tp("typeOjt")}
            </label>
          ))}
        </div>
      </Field>
      <Field label={t("fieldPublish")} hint={t("fieldPublishHint")}>
        <label className="flex items-center gap-2 pt-1 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={material?.is_published ?? true} className="size-4" />
          {t("published")}
        </label>
      </Field>
    </div>
  );
}
