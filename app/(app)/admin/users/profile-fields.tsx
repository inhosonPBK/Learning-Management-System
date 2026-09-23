import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { teamLabel } from "@/lib/data/org";
import type { Department, Locale, Profile, Team } from "@/types/db";

/** Shared profile field set for create/edit forms (server component; uses next-intl hooks in RSC). */
export function ProfileFields({
  profile,
  teams,
  departments,
  managers,
  locale,
}: {
  profile?: Profile | null;
  teams: Team[];
  departments: Department[];
  managers: Profile[];
  locale: Locale;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("admin");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={tc("name")}>
        <Input name="display_name" required defaultValue={profile?.display_name ?? ""} />
      </Field>
      <Field label={tc("email")}>
        <Input name="email" type="email" required defaultValue={profile?.email ?? ""} placeholder="name@promega.com" />
      </Field>
      <Field label={t("nameKo")}>
        <Input name="name_ko" defaultValue={profile?.name_ko ?? ""} />
      </Field>
      <Field label={tc("jobTitle")}>
        <Input name="job_title" defaultValue={profile?.job_title ?? ""} />
      </Field>
      <Field label={t("entity")}>
        <NativeSelect name="entity" defaultValue={profile?.entity ?? ""}>
          <option value="">—</option>
          {["PBK", "PK", "SHARED"].map((e) => <option key={e} value={e}>{e}</option>)}
        </NativeSelect>
      </Field>
      <Field label={t("employeeType")}>
        <NativeSelect name="employee_type" defaultValue={profile?.employee_type ?? "Employee"}>
          {["Employee", "Intern", "Consultant", "Agency Project"].map((e) => <option key={e} value={e}>{e}</option>)}
        </NativeSelect>
      </Field>
      <Field label={tc("team")}>
        <NativeSelect name="team_code" defaultValue={profile?.team_code ?? ""}>
          <option value="">—</option>
          {teams.map((tm) => <option key={tm.code} value={tm.code}>{teamLabel(tm, locale)}</option>)}
        </NativeSelect>
      </Field>
      <Field label={tc("department")}>
        <NativeSelect name="dept_code" defaultValue={profile?.dept_code ?? ""}>
          <option value="">—</option>
          {departments.map((d) => <option key={d.dept_code} value={d.dept_code}>{d.dept_code} · {d.name_en}</option>)}
        </NativeSelect>
      </Field>
      <Field label={tc("manager")} className="sm:col-span-2">
        <NativeSelect name="manager_id" defaultValue={profile?.manager_id ?? ""}>
          <option value="">—</option>
          {managers.filter((m) => m.id !== profile?.id).map((m) => (
            <option key={m.id} value={m.id}>{m.display_name} · {m.job_title ?? ""}</option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  );
}

export function Field({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
