import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth";
import { getCard } from "@/lib/cards";
import { db } from "@/lib/db";
import { getListing, validCondition } from "@/lib/marketplace";

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
  const listingId = String(form.get("listingId") ?? "");
  const listing = await getListing(listingId);
  if (!listing || listing.status !== "open")
    return new Response("Listing is unavailable", { status: 404 });
  if (listing.owner_id === user.id)
    return new Response("You cannot offer on your own listing", {
      status: 400,
    });
  const card = await getCard(String(form.get("cardId") ?? ""));
  const condition = String(form.get("condition") ?? "");
  const message = String(form.get("message") ?? "").trim();
  if (!card || !validCondition(condition) || message.length > 800)
    return NextResponse.redirect(
      new URL(`/listing/${listingId}?error=invalid`, request.url),
      303,
    );
  await (
    await db()
  ).execute({
    sql: "INSERT INTO offers (id, listing_id, sender_id, card_id, card_name, card_image, card_set, card_condition, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)",
    args: [
      crypto.randomUUID(),
      listingId,
      user.id,
      card.id,
      card.name,
      card.image,
      card.set,
      condition,
      message,
      Date.now(),
    ],
  });
  return NextResponse.redirect(new URL("/trades?sent=1", request.url), 303);
}
