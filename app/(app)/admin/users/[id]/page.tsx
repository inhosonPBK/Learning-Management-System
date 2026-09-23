import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/viewer";
import { getAllProfiles, getDepartments, getProfileById, getTeams } from "@/lib/data/org";
import { formatDateTime } from "@/lib/weeks";
import { PageHeader, SectionHeading } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/forms/action-form";
import { ProfileFields } from "../profile-fields";
import { updateUser, updateFlags, resetTempPassword, deactivateUser, reactivateUser } from "../actions";
import type { Locale } from "@/types/db";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdmin();
  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) notFound();

  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const [teams, departments, profiles] = await Promise.all([getTeams(), getDepartments(), getAllProfiles()]);

  const update = updateUser.bind(null, id);
  const flags = updateFlags.bind(null, id);
  const reset = resetTempPassword.bind(null, id);
  const deactivate = deactivateUser.bind(null, id);
  const reactivate = reactivateUser.bind(null, id);

  return (
    <>
      <PageHeader
        title={profile.display_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {profile.email}
            <Badge variant="outline" className={profile.is_active ? "text-status-completed" : "text-muted-foreground"}>{profile.is_active ? tc("active") : tc("inactive")}</Badge>
            <span className="text-xs">{t("lastLogin")}: {formatDateTime(profile.last_login_at, locale)}</span>
          </span>
        }
        back={{ href: "/admin/users", label: t("users") }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <ActionForm action={update} submitLabel={tc("save")} successMessage={tc("saved")}>
                <ProfileFields profile={profile} teams={teams} departments={departments} managers={profiles.filter((p) => p.is_active)} locale={locale} />
              </ActionForm>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <SectionHeading title={t("flags")} description={t("flagsHint")} />
              <ActionForm action={flags} submitLabel={tc("save")} successMessage={tc("saved")}>
                {[
                  ["is_admin", "Admin", profile.is_admin, profile.id === viewer.id],
                  ["is_people_ops", "People Operations", profile.is_people_ops, false],
                  ["is_gm", "GM", profile.is_gm, false],
                ].map(([name, label, checked, locked]) => (
                  <label key={String(name)} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} disabled={Boolean(locked)} className="size-4" />
                    {String(label)}
                    {locked ? <span className="text-xs text-muted-foreground">({t("selfLocked")})</span> : null}
                  </label>
                ))}
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <SectionHeading title={t("access")} />
              {profile.is_active ? (
                <>
                  <ActionForm action={reset} submitLabel={t("resetPassword")} variant="outline" confirmMessage={t("resetPasswordConfirm")} className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t("resetPasswordHint")}</p>
                  </ActionForm>
                  {profile.id !== viewer.id && (
                    <ActionForm action={deactivate} submitLabel={t("deactivate")} variant="destructive" confirmMessage={t("deactivateConfirm")} className="space-y-2">
                      <p className="text-xs text-muted-foreground">{t("deactivateHint")}</p>
                    </ActionForm>
                  )}
                </>
              ) : (
                <ActionForm action={reactivate} submitLabel={t("reactivate")} confirmMessage={t("reactivateConfirm")} className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t("reactivateHint")}</p>
                </ActionForm>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
