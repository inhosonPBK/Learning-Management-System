import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/shell/sign-out-button";

export default async function InactivePage() {
  const t = await getTranslations("auth");
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="border-t-4 border-brand-gold">
        <CardTitle className="text-2xl text-brand-navy">{t("inactiveTitle")}</CardTitle>
        <CardDescription>{t("inactiveBody")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignOutButton variant="outline" className="w-full" />
      </CardContent>
    </Card>
  );
}
