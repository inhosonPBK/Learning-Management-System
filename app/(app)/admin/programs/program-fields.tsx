import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "../users/profile-fields";
import type { Program, ReportType } from "@/types/db";

export function ProgramFields({ program, reportTypes, locale }: { program?: Program | null; reportTypes: ReportType[]; locale: "ko" | "en" }) {
  const t = useTranslations("programs");
  const ts = useTranslations("status");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("type")}>
        <NativeSelect name="program_type" defaultValue={program?.program_type ?? "intern"}>
          <option value="intern">{t("typeIntern")}</option>
          <option value="new_hire">{t("typeNewHire")}</option>
          <option value="ojt">{t("typeOjt")}</option>
        </NativeSelect>
      </Field>
      <Field label={t("status")}>
        <NativeSelect name="status" defaultValue={program?.status ?? "planned"}>
          {(["planned", "active", "closed"] as const).map((s) => <option key={s} value={s}>{ts(s)}</option>)}
        </NativeSelect>
      </Field>
      <Field label={t("nameKo")}>
        <Input name="name_ko" required defaultValue={program?.name_ko ?? ""} placeholder="2026 하반기 인턴십" />
      </Field>
      <Field label={t("nameEn")}>
        <Input name="name_en" required defaultValue={program?.name_en ?? ""} placeholder="2026 H2 Internship" />
      </Field>
      <Field label={t("startDate")}>
        <Input name="start_date" type="date" required defaultValue={program?.start_date ?? ""} />
      </Field>
      <Field label={t("endDate")}>
        <Input name="end_date" type="date" required defaultValue={program?.end_date ?? ""} />
      </Field>
      <Field label={t("durationWeeks")} hint={t("durationHint")}>
        <Input name="duration_weeks" type="number" min={1} max={104} defaultValue={program?.duration_weeks ?? ""} />
      </Field>
      <Field label={t("reportTypes")}>
        <div className="flex flex-wrap gap-3 pt-1">
          {reportTypes.map((rt) => (
            <label key={rt.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="enabled_report_types"
                value={rt.code}
                defaultChecked={program ? program.enabled_report_types.includes(rt.code) : rt.code !== "training"}
                className="size-4"
              />
              {locale === "ko" ? rt.name_ko : rt.name_en}
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
