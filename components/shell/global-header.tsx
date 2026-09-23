import { getTranslations } from "next-intl/server";
import { Bell, CircleHelp } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { LangToggle } from "./lang-toggle";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { HeaderSearch } from "./header-search";
import { Button } from "@/components/ui/button";
import type { ShellUser } from "./nav-config";

/** DAM-style top bar: brand · search · utilities (notifications, help, language, avatar). */
export async function GlobalHeader({ user }: { user: ShellUser }) {
  const t = await getTranslations("nav");
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <MobileNav user={user} />
        <BrandMark />
        <div className="ml-auto hidden max-w-md flex-1 md:block">
          <HeaderSearch placeholder={t("search")} />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="ghost" size="icon" aria-label={t("notifications")} disabled title={t("notifications")}>
            <Bell />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("help")} nativeButton={false} render={<a href="/manual-ko.html" target="_blank" rel="noreferrer" />}>
            <CircleHelp />
          </Button>
          <LangToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
