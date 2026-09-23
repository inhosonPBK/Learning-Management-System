"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { ActionState } from "@/components/forms/action-form";

export async function updateTeam(code: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireStaff();
  const name_ko = fd.get("name_ko")?.toString().trim() || null;
  const name_en = fd.get("name_en")?.toString().trim();
  const lead_id = fd.get("lead_id")?.toString().trim() || null;
  const is_active = fd.get("is_active") === "on";
  if (!name_en) return { error: "English name is required." };

  const { error } = await createAdminClient().from("teams").update({ name_ko, name_en, lead_id, is_active }).eq("code", code);
  if (error) return { error: error.message };
  await logAudit(viewer.id, "team.update", "team", null, { code, name_ko, name_en, lead_id });
  revalidatePath("/admin/teams");
  return { ok: true };
}
