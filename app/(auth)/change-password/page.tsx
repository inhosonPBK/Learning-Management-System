import { getTranslations } from "next-intl/server";
import { requireViewer } from "@/lib/auth/viewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const viewer = await requireViewer({ allowMustChange: true });
  const t = await getTranslations("auth");
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="border-t-4 border-brand-yellow">
        <CardTitle className="text-2xl text-brand-navy">{t("changeTitle")}</CardTitle>
        <CardDescription>{t("changeSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {viewer.mustChangePassword && (
          <Alert>
            <AlertDescription>{t("changeFirstLogin")}</AlertDescription>
          </Alert>
        )}
        <ChangePasswordForm forced={viewer.mustChangePassword} />
      </CardContent>
    </Card>
  );
}
