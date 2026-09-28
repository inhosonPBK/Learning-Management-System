import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { KeyRound } from "lucide-react";
import { requireViewer } from "@/lib/auth/viewer";
import { getTeams, teamLabel } from "@/lib/data/org";
import { avatarUrl } from "@/lib/avatars";
import { Container, PageHeader, SectionHeading } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/components/avatar-uploader";
import type { Locale } from "@/types/db";

/** My profile: photo, read-only org details, password link. */
export default async function SettingsPage() {
  const viewer = await requireViewer();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("settings");
  const ta = await getTranslations("auth");
  const tc = await getTranslations("common");
  const teams = await getTeams();
  const p = viewer.profile;
  const team = teams.find((x) => x.code === p.team_code);

  return (
    <Container size="md">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Card>
        <CardContent className="space-y-6 pt-6">
          <SectionHeading title={t("photo")} description={t("photoHint")} />
          <AvatarUploader profileId={p.id} name={p.display_name} currentUrl={avatarUrl(p.avatar_path)} />

          <SectionHeading title={t("details")} description={t("detailsHint")} />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              [tc("name"), p.display_name],
              [tc("email"), p.email],
              [tc("jobTitle"), p.job_title ?? "—"],
              [tc("team"), teamLabel(team, locale) ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-muted/30 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>

          <SectionHeading title={t("security")} />
          <Button variant="outline" nativeButton={false} render={<Link href="/change-password" />}><KeyRound />{ta("changeTitle")}</Button>
        </CardContent>
      </Card>
    </Container>
  );
}
