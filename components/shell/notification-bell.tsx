"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, ClipboardCheck, FilePen, CalendarClock, UserX, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Todo } from "@/lib/data/todos";

const ICON = { review: ClipboardCheck, draft: FilePen, weekly_due: CalendarClock, no_mentor: UserX } as const;
const COLOR = { review: "text-brand-yellow-dark", draft: "text-status-draft", weekly_due: "text-brand-blue", no_mentor: "text-destructive" } as const;

export function todoText(t: ReturnType<typeof useTranslations<"todos">>, todo: Todo) {
  switch (todo.kind) {
    case "review":
      return t("review", { who: todo.who ?? "—", week: todo.week ?? 0 });
    case "draft":
      return todo.reportType === "weekly" ? t("draftWeekly", { week: todo.week ?? 0 }) : t("draftInterview");
    case "weekly_due":
      return t("weeklyDue", { week: todo.week ?? 0 });
    case "no_mentor":
      return t("noMentor", { who: todo.who ?? "—" });
  }
}

export function NotificationBell({ todos }: { todos: Todo[] }) {
  const t = useTranslations("todos");
  const count = todos.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={t("title")} />}>
        <Bell />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold text-foreground">{t("title")}</span>
            <span className="text-xs text-muted-foreground">{t("count", { count })}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t("empty")}</div>
        ) : (
          todos.slice(0, 8).map((todo) => {
            const Icon = ICON[todo.kind];
            return (
              <DropdownMenuItem key={todo.key} render={<Link href={todo.href} />} className="items-start gap-2.5 py-2">
                <Icon className={`mt-0.5 size-4 shrink-0 ${COLOR[todo.kind]}`} />
                <span className="flex-1 text-sm leading-snug">{todoText(t, todo)}</span>
              </DropdownMenuItem>
            );
          })
        )}
        {count > 8 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard" />} className="justify-center text-xs text-brand-blue">
              {t("viewAll")} <ArrowRight className="size-3" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
