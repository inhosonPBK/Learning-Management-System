/** Bare layout for print sheets — no app shell, white paper. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-[#1a1a1a]">{children}</div>;
}
