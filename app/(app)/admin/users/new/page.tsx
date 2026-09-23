import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/viewer";
import { getAllProfiles, getDepartments, getTeams } from "@/lib/data/org";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ActionForm } from "@/components/forms/action-form";
import { ProfileFields } from "../profile-fields";
import { createUser } from "../actions";
import type { Locale } from "@/types/db";

export default async function NewUserPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const locale = (await getLocale()) as Locale;
  const [teams, departments, profiles] = await Promise.all([getTeams(), getDepartments(), getAllProfiles()]);

  return (
    <>
      <PageHeader title={t("newUser")} description={t("newUserSubtitle")} back={{ href: "/admin/users", label: t("users") }} />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <ActionForm action={createUser} submitLabel={t("createUser")} successMessage={t("userCreated")}>
            <ProfileFields teams={teams} departments={departments} managers={profiles.filter((p) => p.is_active)} locale={locale} />
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
