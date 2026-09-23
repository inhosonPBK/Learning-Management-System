import { cn } from "@/lib/utils";

/** Shared print chrome: company label, title, meta line, navy rule. */
export function PrintSheet({ title, meta, children, wide }: { title: string; meta?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("mx-auto px-8 py-8 text-[13.5px] leading-relaxed print:px-4 print:py-4", wide ? "max-w-5xl" : "max-w-3xl")}>
      <header className="mb-6 border-b-[3px] border-brand-navy pb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-blue">Promega Korea · Promega Biosystems Korea</div>
        <h1 className="text-xl font-bold text-brand-navy">{title}</h1>
        {meta && <div className="mt-1 text-xs text-neutral-500">{meta}</div>}
      </header>
      {children}
    </div>
  );
}

export function PrintSection({ num, title, color = "navy", children }: { num: string; title: string; color?: "navy" | "orange" | "gray"; children: React.ReactNode }) {
  const bg = color === "orange" ? "bg-tile-orange text-white" : color === "gray" ? "bg-neutral-600 text-white" : "bg-brand-navy text-white";
  const fg = color === "orange" ? "text-tile-orange" : color === "gray" ? "text-neutral-600" : "text-brand-navy";
  return (
    <section className="mb-3.5 break-inside-avoid rounded-lg border border-neutral-200 p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-bold", bg)}>{num}</span>
        <span className={cn("text-sm font-bold", fg)}>{title}</span>
      </div>
      {children}
    </section>
  );
}

export function PrintText({ children }: { children: React.ReactNode }) {
  return <div className="min-h-10 whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] leading-7">{children || "—"}</div>;
}

export function PrintPills({ options, value }: { options: readonly string[]; value: string | null | undefined }) {
  return (
    <div className="mb-2.5 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <span key={o} className={cn("rounded-full border px-3.5 py-1 text-xs font-semibold", value === o ? "border-brand-navy bg-brand-navy text-white" : "border-neutral-300 text-neutral-500")}>
          {o}
        </span>
      ))}
    </div>
  );
}
