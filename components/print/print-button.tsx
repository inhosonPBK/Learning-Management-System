"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-navy-deep"
    >
      <Printer className="size-4" />
      {label}
    </button>
  );
}
