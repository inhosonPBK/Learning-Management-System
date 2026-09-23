import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "draft" | "submitted" | "completed" | "planned" | "active" | "closed" | "withdrawn";

const STYLES: Record<Status, string> = {
  draft: "bg-orange-50 text-status-draft border-orange-200",
  submitted: "bg-blue-50 text-status-submitted border-blue-200",
  completed: "bg-green-50 text-status-completed border-green-200",
  planned: "bg-muted text-muted-foreground border-border",
  active: "bg-green-50 text-status-completed border-green-200",
  closed: "bg-muted text-muted-foreground border-border",
  withdrawn: "bg-red-50 text-destructive border-red-200",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const t = useTranslations("status");
  return (
    <Badge variant="outline" className={cn("font-semibold", STYLES[status], className)}>
      {t(status)}
    </Badge>
  );
}
