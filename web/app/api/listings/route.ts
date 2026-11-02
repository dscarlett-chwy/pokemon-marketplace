import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth";
import { getCard } from "@/lib/cards";
import { db } from "@/lib/db";
import { validCondition } from "@/lib/marketplace";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return new Response("Invalid request origin", { status: 403 });
  const user = await currentUser();
  if (!user)
    return NextResponse.redirect(
      new URL("/account?mode=login", request.url),
      303,
    );
  const form = await request.formData();
  const card = await getCard(String(form.get("cardId") ?? ""));
  const condition = String(form.get("condition") ?? "");
  const lookingFor = String(form.get("lookingFor") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (
    !card ||
    !validCondition(condition) ||
    !lookingFor ||
    lookingFor.length > 160 ||
    description.length > 800
  ) {
    return NextResponse.redirect(
      new URL("/new?error=invalid", request.url),
      303,
    );
  }
  const id = crypto.randomUUID();
  await (
    await db()
  ).execute({
    sql: "INSERT INTO listings (id, owner_id, card_id, card_name, card_image, card_set, card_number, card_condition, looking_for, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)",
    args: [
      id,
      user.id,
      card.id,
      card.name,
      card.image,
      card.set,
      card.number,
      condition,
      lookingFor,
      description,
      Date.now(),
    ],
  });
  return NextResponse.redirect(new URL(`/listing/${id}`, request.url), 303);
}
