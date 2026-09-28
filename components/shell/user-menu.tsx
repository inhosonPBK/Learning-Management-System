"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { KeyRound, LogOut, Settings2, UserRound } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import type { ShellUser } from "./nav-config";

export function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations("nav");
  const ta = useTranslations("auth");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="ml-1 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-brand-blue"
            aria-label={user.displayName}
          />
        }
      >
        <UserAvatar name={user.displayName} src={user.avatarUrl} className="size-9 border-2 border-brand-yellow" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <div className="text-sm font-semibold text-foreground">{user.displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            {(user.jobTitle || user.teamName) && (
              <div className="mt-1 text-xs text-muted-foreground">
                {[user.jobTitle, user.teamName].filter(Boolean).join(" · ")}
              </div>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <UserRound />
          {t("settings")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/change-password" />}>
          <KeyRound />
          {ta("changeTitle")}
        </DropdownMenuItem>
        {user.isStaff && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Settings2 />
            {t("admin")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
