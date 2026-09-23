import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProgramType } from "@/types/db";

export interface MaterialCategory {
  code: string;
  name_ko: string;
  name_en: string;
  sort_order: number;
  is_active: boolean;
}

export interface Material {
  id: string;
  category_code: string;
  title: string;
  body: string | null;
  author_id: string | null;
  program_types: ProgramType[] | null;
  is_published: boolean;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export const getMaterialCategories = cache(async (): Promise<MaterialCategory[]> => {
  const { data } = await createAdminClient().from("material_categories").select("*").eq("is_active", true).order("sort_order");
  return (data ?? []) as MaterialCategory[];
});

/** Published materials for everyone; drafts only for their author / staff (filtered by caller). */
export async function listMaterials(opts: { category?: string; q?: string; includeDraftsBy?: string | null; includeAllDrafts?: boolean }): Promise<Material[]> {
  let query = createAdminClient().from("training_materials").select("*").order("published_at", { ascending: false, nullsFirst: true }).order("updated_at", { ascending: false });
  if (opts.category) query = query.eq("category_code", opts.category);
  if (opts.q) query = query.or(`title.ilike.%${opts.q.replace(/[%,]/g, "")}%,body.ilike.%${opts.q.replace(/[%,]/g, "")}%`);
  const { data } = await query;
  const rows = (data ?? []) as Material[];
  return rows.filter((m) => m.is_published || opts.includeAllDrafts || (opts.includeDraftsBy && m.author_id === opts.includeDraftsBy));
}

export async function getMaterial(id: string): Promise<Material | null> {
  const { data } = await createAdminClient().from("training_materials").select("*").eq("id", id).maybeSingle<Material>();
  return data ?? null;
}

export function categoryLabel(c: MaterialCategory | undefined, locale: "ko" | "en") {
  if (!c) return "";
  return locale === "ko" ? c.name_ko : c.name_en;
}
