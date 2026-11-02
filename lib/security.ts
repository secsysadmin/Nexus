import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export const token = () => randomBytes(32).toString("hex");
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  try {
    const [method, salt, h] = hash.split(":");
    if (method !== "scrypt" || !salt || !h) return false;
    const expected = Buffer.from(h, "hex");
    const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export const sessionCookie = "nexus_session";
