"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/i18n/request";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

/**
 * Runs right after a successful client-side sign-in:
 * stamps last_login_at, seeds the UI-locale cookie from the profile,
 * and tells the client where to go (forced password change first).
 */
export async function afterLogin(): Promise<{ redirectTo: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { redirectTo: "/login" };

  const admin = createAdminClient();
  await admin.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", viewer.id);
  await logAudit(viewer.id, "auth.login", "auth", viewer.id);

  const store = await cookies();
  if (!store.get(LOCALE_COOKIE)) {
    store.set(LOCALE_COOKIE, viewer.profile.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }

  if (!viewer.isActive) return { redirectTo: "/inactive" };
  if (viewer.mustChangePassword) return { redirectTo: "/change-password" };
  return { redirectTo: null };
}
