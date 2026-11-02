import { NextResponse } from "next/server";
import {
  createSession,
  clearSession,
  hashPassword,
  sameOrigin,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return new Response("Invalid request origin", { status: 403 });
  const form = await request.formData();
  const mode = String(form.get("mode") ?? "");
  if (mode === "logout") {
    await clearSession();
    return NextResponse.redirect(new URL("/", request.url), 303);
  }
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 10 ||
    password.length > 200
  ) {
    return NextResponse.redirect(
      new URL(
        `/account?mode=${mode === "signup" ? "signup" : "login"}&error=invalid`,
        request.url,
      ),
      303,
    );
  }
  const client = await db();
  if (mode === "signup") {
    if (name.length < 2 || name.length > 60)
      return NextResponse.redirect(
        new URL("/account?mode=signup&error=name", request.url),
        303,
      );
    try {
      const id = crypto.randomUUID();
      await client.execute({
        sql: "INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
        args: [id, email, hashPassword(password), name, Date.now()],
      });
      await createSession(id);
      return NextResponse.redirect(new URL("/trades", request.url), 303);
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        return NextResponse.redirect(
          new URL("/account?mode=signup&error=exists", request.url),
          303,
        );
      throw error;
    }
  }
  if (mode !== "login") return new Response("Invalid mode", { status: 400 });
  const result = await client.execute({
    sql: "SELECT id, password_hash FROM users WHERE email = ?",
    args: [email],
  });
  const row = result.rows[0];
  if (!row || !verifyPassword(password, String(row.password_hash)))
    return NextResponse.redirect(
      new URL("/account?mode=login&error=credentials", request.url),
      303,
    );
  await createSession(String(row.id));
  return NextResponse.redirect(new URL("/trades", request.url), 303);
}
