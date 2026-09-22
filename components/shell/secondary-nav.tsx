import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";
import type { ShellUser } from "./nav-config";

/** promega.com-style dark secondary bar with text links; DAM-style primary action on the right. */
export async function SecondaryNav({ user }: { user: ShellUser }) {
  const t = await getTranslations("nav");
  return (
    <div className="hidden bg-brand-navy md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <NavLinks user={user} />
        <Button
          size="sm"
          className="bg-brand-yellow font-semibold text-brand-navy-deep hover:bg-brand-yellow-dark"
          render={<Link href="/reports?new=1" />}
        >
          <Plus />
          {t("newReport")}
        </Button>
      </div>
    </div>
  );
}
