import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/shell/brand-mark";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("app");
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandMark href="/login" />
          <span className="hidden text-xs font-medium uppercase tracking-widest text-muted-foreground sm:block">{t("company")}</span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
      <footer className="py-6 text-center text-xs text-muted-foreground">{t("company")}</footer>
    </div>
  );
}
