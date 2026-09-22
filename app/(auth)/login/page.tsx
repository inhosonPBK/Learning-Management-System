import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="border-t-4 border-brand-yellow">
        <CardTitle className="text-2xl text-brand-navy">{t("signInTitle")}</CardTitle>
        <CardDescription>{t("signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next && next.startsWith("/") ? next : "/dashboard"} />
        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">{t("forgotHint")}</p>
      </CardContent>
    </Card>
  );
}
