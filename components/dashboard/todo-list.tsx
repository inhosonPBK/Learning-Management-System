"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarClock, ClipboardCheck, FilePen, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { todoText } from "@/components/shell/notification-bell";
import type { Todo } from "@/lib/data/todos";

const ICON = { review: ClipboardCheck, draft: FilePen, weekly_due: CalendarClock, no_mentor: UserX } as const;
const BADGE = {
  review: "bg-brand-yellow text-brand-navy-deep",
  draft: "bg-orange-100 text-status-draft",
  weekly_due: "bg-blue-100 text-brand-blue",
  no_mentor: "bg-red-100 text-destructive",
} as const;

export function TodoList({ todos }: { todos: Todo[] }) {
  const t = useTranslations("todos");
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-white">
      {todos.map((todo) => {
        const Icon = ICON[todo.kind];
        return (
          <li key={todo.key}>
            <Link href={todo.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
              <Badge className={`gap-1 ${BADGE[todo.kind]}`}><Icon className="size-3" />{t(`kind.${todo.kind}`)}</Badge>
              <span className="flex-1">{todoText(t, todo)}</span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
