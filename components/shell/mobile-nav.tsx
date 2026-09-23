"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";
import type { ShellUser } from "./nav-config";

export function MobileNav({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-brand-navy">Training Hub</SheetTitle>
        </SheetHeader>
        <NavLinks user={user} variant="list" onNavigate={() => setOpen(false)} />
        <div className="px-4">
          <Button
            className="w-full bg-brand-yellow font-semibold text-brand-navy-deep hover:bg-brand-yellow-dark"
            nativeButton={false}
            render={<Link href="/reports?new=1" onClick={() => setOpen(false)} />}
          >
            <Plus />
            {t("newReport")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
