import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  back,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-3.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** DAM-style section heading with a gold rule above. */
export function SectionHeading({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="section-rule mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Container({ children, className, size = "lg" }: { children: React.ReactNode; className?: string; size?: "md" | "lg" | "xl" }) {
  const w = size === "md" ? "max-w-3xl" : size === "xl" ? "max-w-7xl" : "max-w-6xl";
  return <div className={cn("mx-auto w-full px-4 py-8 sm:px-6", w, className)}>{children}</div>;
}
