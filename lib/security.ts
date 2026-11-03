import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
export const token = () => randomBytes(32).toString("hex");
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
const derive = (
  password: string,
  salt: string,
  N: number,
  r: number,
  p: number,
) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N, r, p, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
const current = { N: 16384, r: 8, p: 5 };
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, current.N, current.r, current.p);
  return `scrypt-v2:${current.N}:${current.r}:${current.p}:${salt}:${key.toString("hex")}`;
}
export function passwordNeedsUpgrade(hash: string) {
  return !hash.startsWith("scrypt-v2:16384:8:5:");
}
export async function verifyPassword(password: string, hash: string) {
  try {
    const parts = hash.split(":");
    let salt: string, encoded: string, N: number, r: number, p: number;
    if (parts[0] === "scrypt" && parts.length === 3) {
      [, salt, encoded] = parts;
      N = 16384;
      r = 8;
      p = 1;
    } else if (parts[0] === "scrypt-v2" && parts.length === 6) {
      N = Number(parts[1]);
      r = Number(parts[2]);
      p = Number(parts[3]);
      salt = parts[4];
      encoded = parts[5];
      if (N !== current.N || r !== 8 || p !== 5) return false;
    } else return false;
    if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(encoded))
      return false;
    const expected = Buffer.from(encoded, "hex"),
      actual = await derive(password, salt, N, r, p);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
// Real-cost dummy avoids distinguishing unknown/unactivated usernames by timing.
export const dummyPasswordHash =
  "scrypt-v2:16384:8:5:" + "0".repeat(32) + ":" + "0".repeat(128);
export const sessionCookie = "nexus_session";
export function secretMatches(
  value: string | null,
  secret: string | undefined,
) {
  if (!value || !secret || secret.length < 32) return false;
  return timingSafeEqual(
    Buffer.from(digest(value)),
    Buffer.from(digest(secret)),
  );
}
