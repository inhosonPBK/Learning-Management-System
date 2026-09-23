import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Department, Profile, Team } from "@/types/db";

export const getTeams = cache(async (): Promise<Team[]> => {
  const { data } = await createAdminClient().from("teams").select("*").order("sort_order");
  return (data ?? []) as Team[];
});

export const getDepartments = cache(async (): Promise<Department[]> => {
  const { data } = await createAdminClient().from("departments").select("*").order("sort_order");
  return (data ?? []) as Department[];
});

export const getAllProfiles = cache(async (): Promise<Profile[]> => {
  const { data } = await createAdminClient().from("profiles").select("*").order("display_name");
  return (data ?? []) as Profile[];
});

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data } = await createAdminClient().from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  return data ?? null;
}

/** Fetch a set of profiles by id and return a lookup map. */
export async function getProfilesMap(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data } = await createAdminClient().from("profiles").select("*").in("id", unique);
  return new Map(((data ?? []) as Profile[]).map((p) => [p.id, p]));
}

export function teamLabel(team: Team | undefined | null, locale: "ko" | "en") {
  if (!team) return null;
  return locale === "ko" ? team.name_ko ?? team.name_en : team.name_en;
}
