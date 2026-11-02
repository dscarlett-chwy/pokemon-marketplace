import "server-only";
import { cookies } from "next/headers";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { db } from "./db";

const COOKIE = "card_circuit_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
export type User = { id: string; email: string; displayName: string };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || hash.length !== 128) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await (
    await db()
  ).execute({
    sql: "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    args: [tokenHash, userId, expiresAt],
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await (
    await db()
  ).execute({
    sql: "SELECT u.id, u.email, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    args: [hash, Math.floor(Date.now() / 1000)],
  });
  const row = result.rows[0];
  return row
    ? {
        id: String(row.id),
        email: String(row.email),
        displayName: String(row.display_name),
      }
    : null;
}

export async function clearSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token)
    await (
      await db()
    ).execute({
      sql: "DELETE FROM sessions WHERE token_hash = ?",
      args: [createHash("sha256").update(token).digest("hex")],
    });
  (await cookies()).delete(COOKIE);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
