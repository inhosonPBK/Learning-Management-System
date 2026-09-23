import { getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodos } from "@/lib/data/todos";
import { GlobalHeader } from "@/components/shell/global-header";
import { SecondaryNav } from "@/components/shell/secondary-nav";
import { initialsOf, type ShellUser } from "@/components/shell/nav-config";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  const t = await getTranslations("app");

  const [teamRow, todos] = await Promise.all([
    viewer.profile.team_code
      ? createAdminClient().from("teams").select("name_ko, name_en").eq("code", viewer.profile.team_code).maybeSingle<{ name_ko: string | null; name_en: string }>()
      : Promise.resolve({ data: null }),
    getTodos(viewer),
  ]);
  const teamName = teamRow.data ? (viewer.profile.locale === "ko" ? teamRow.data.name_ko ?? teamRow.data.name_en : teamRow.data.name_en) : null;

  const user: ShellUser = {
    id: viewer.id,
    displayName: viewer.profile.display_name,
    email: viewer.profile.email,
    jobTitle: viewer.profile.job_title,
    teamName,
    initials: initialsOf(viewer.profile.display_name),
    isStaff: viewer.isAdmin || viewer.isPeopleOps,
    isAdmin: viewer.isAdmin,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <GlobalHeader user={user} todos={todos} />
      <SecondaryNav user={user} />
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-white py-5 text-center text-xs text-muted-foreground">{t("company")}</footer>
    </div>
  );
}
