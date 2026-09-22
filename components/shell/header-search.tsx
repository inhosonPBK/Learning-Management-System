"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Phase 1: searches the org directory. Later: global search across reports/materials. */
export function HeaderSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q")?.toString().trim();
        router.push(q ? `/people?q=${encodeURIComponent(q)}` : "/people");
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" placeholder={placeholder} className="h-9 rounded-full bg-surface pl-9" />
    </form>
  );
}
