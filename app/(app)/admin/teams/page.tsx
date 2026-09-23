import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth/viewer";
import { getAllProfiles, getTeams } from "@/lib/data/org";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionForm } from "@/components/forms/action-form";
import { updateTeam } from "./actions";

export default async function TeamsPage() {
  await requireStaff();
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const [teams, profiles] = await Promise.all([getTeams(), getAllProfiles()]);
  const active = profiles.filter((p) => p.is_active);
  const memberCount = (code: string) => profiles.filter((p) => p.team_code === code).length;

  return (
    <>
      <PageHeader title={t("teams")} description={t("teamsHint")} />
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="grid grid-cols-[1fr_1.4fr_1.4fr_1.6fr_auto_auto] gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Code</span><span>{t("nameKo")}</span><span>{t("nameEn")}</span><span>{t("lead")}</span><span>{t("members")}</span><span />
        </div>
        {teams.map((tm) => (
          <ActionForm
            key={tm.code}
            action={updateTeam.bind(null, tm.code)}
            submitLabel={tc("save")}
            successMessage={tc("saved")}
            className="grid grid-cols-[1fr_1.4fr_1.4fr_1.6fr_auto_auto] items-center gap-3 border-b px-4 py-2 last:border-b-0 space-y-0"
          >
            <code className="text-xs text-muted-foreground">{tm.code}</code>
            <Input name="name_ko" defaultValue={tm.name_ko ?? ""} />
            <Input name="name_en" defaultValue={tm.name_en} required />
            <NativeSelect name="lead_id" defaultValue={tm.lead_id ?? ""}>
              <option value="">—</option>
              {active.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </NativeSelect>
            <span className="text-sm tabular-nums">{memberCount(tm.code)}</span>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="is_active" defaultChecked={tm.is_active} className="size-3.5" />{tc("active")}</label>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
