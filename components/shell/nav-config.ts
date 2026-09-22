import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, FileText, BookOpen, Users, Settings2 } from "lucide-react";

export interface NavItem {
  key: "dashboard" | "reports" | "materials" | "people" | "admin";
  href: string;
  icon: LucideIcon;
  /** matches when pathname starts with any of these */
  match: string[];
  staffOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, match: ["/dashboard"] },
  { key: "reports", href: "/reports", icon: FileText, match: ["/reports", "/trainees"] },
  { key: "materials", href: "/materials", icon: BookOpen, match: ["/materials"] },
  { key: "people", href: "/people", icon: Users, match: ["/people"] },
  { key: "admin", href: "/admin", icon: Settings2, match: ["/admin"], staffOnly: true },
];

/** Minimal, serializable viewer info passed from the server layout to client shell parts. */
export interface ShellUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  teamName: string | null;
  initials: string;
  isStaff: boolean;
  isAdmin: boolean;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
