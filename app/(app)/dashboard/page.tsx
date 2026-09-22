import { getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const t = await getTranslations("dashboard");
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-brand-navy">{t("greeting", { name: viewer.profile.display_name })}</h1>
      <p className="mt-2 text-muted-foreground">{t("title")}</p>
    </div>
  );
}
