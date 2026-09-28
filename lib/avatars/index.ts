/** Public URL for a stored avatar (bucket `avatars` is public; object names are random uuids). */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/avatars/${path}` : null;
}

export const AVATARS_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_SIZE = 256; // px — client resizes to this square before upload
