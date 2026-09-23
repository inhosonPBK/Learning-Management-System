import { randomInt } from "node:crypto";

/** 12-char temp password from an unambiguous alphabet, guaranteed ≥2 letters and ≥2 digits. */
export function generateTempPassword(len = 12) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const pick = (s: string) => s[randomInt(s.length)];
  const chars = [pick(letters), pick(letters), pick(digits), pick(digits)];
  while (chars.length < len) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
