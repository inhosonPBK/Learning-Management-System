import Link from "next/link";
import { cn } from "@/lib/utils";

/** Yellow Promega logo tile + product name, as in the DAM header. */
export function BrandMark({ href = "/dashboard", size = "md", className }: { href?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const tile = size === "lg" ? "h-14 px-5 text-xl" : size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-base";
  const name = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 no-underline", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-brand-yellow font-extrabold tracking-tight text-brand-navy-deep shadow-sm",
          tile,
        )}
        aria-hidden
      >
        Promega
      </span>
      <span className={cn("font-semibold text-brand-navy", name)}>Training Hub</span>
    </Link>
  );
}
