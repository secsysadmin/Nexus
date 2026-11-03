import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
const TOKEN_BYTES = 32;
const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
export const SESSION_COOKIE = "nexus_session";
export const SESSION_TTL_DAYS = 7;
export const token = () => randomBytes(TOKEN_BYTES).toString("hex");
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  try {
    const [method, salt, h] = hash.split(":");
    if (method !== "scrypt" || !salt || !h) return false;
    const expected = Buffer.from(h, "hex");
    const actual = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
