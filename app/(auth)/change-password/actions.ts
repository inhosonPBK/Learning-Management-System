"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export type ChangePasswordState = { error?: "weak" | "mismatch" | string };

const schema = z
  .object({
    password: z.string().min(10).regex(/[A-Za-z]/).regex(/\d/),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "mismatch" });

export async function changePassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const viewer = await requireViewer({ allowMustChange: true });

  const parsed = schema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((i) => i.path[0] === "confirm");
    return { error: mismatch ? "mismatch" : "weak" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  await createAdminClient().from("profiles").update({ must_change_password: false }).eq("id", viewer.id);
  await logAudit(viewer.id, "auth.password_changed", "profile", viewer.id, { forced: viewer.mustChangePassword });

  redirect("/dashboard");
}
