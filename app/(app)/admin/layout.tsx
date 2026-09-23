import { requireStaff } from "@/lib/auth/viewer";
import { AdminSubnav } from "./subnav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <AdminSubnav isAdmin={viewer.isAdmin} />
      {children}
    </div>
  );
}
