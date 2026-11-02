import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request))
    return new Response("Invalid request origin", { status: 403 });
  const user = await currentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const client = await db();
  const result = await client.execute({
    sql: "SELECT o.id, o.sender_id, o.status, o.listing_id, l.owner_id, l.status AS listing_status FROM offers o JOIN listings l ON l.id = o.listing_id WHERE o.id = ?",
    args: [id],
  });
  const offer = result.rows[0];
  if (!offer || offer.status !== "pending")
    return new Response("Offer is unavailable", { status: 404 });
  if (action === "withdraw" && offer.sender_id === user.id) {
    await client.execute({
      sql: "UPDATE offers SET status = 'withdrawn' WHERE id = ? AND status = 'pending'",
      args: [id],
    });
  } else if (action === "decline" && offer.owner_id === user.id) {
    await client.execute({
      sql: "UPDATE offers SET status = 'declined' WHERE id = ? AND status = 'pending'",
      args: [id],
    });
  } else if (
    action === "accept" &&
    offer.owner_id === user.id &&
    offer.listing_status === "open"
  ) {
    const transaction = await client.transaction("write");
    try {
      const closed = await transaction.execute({
        sql: "UPDATE listings SET status = 'matched' WHERE id = ? AND owner_id = ? AND status = 'open'",
        args: [offer.listing_id, user.id],
      });
      if (!closed.rowsAffected) throw new Error("Listing is already matched");
      await transaction.execute({
        sql: "UPDATE offers SET status = 'accepted' WHERE id = ? AND status = 'pending'",
        args: [id],
      });
      await transaction.execute({
        sql: "UPDATE offers SET status = 'declined' WHERE listing_id = ? AND id != ? AND status = 'pending'",
        args: [offer.listing_id, id],
      });
      await transaction.commit();
    } catch {
      await transaction.rollback();
      return new Response("Listing is already matched", { status: 409 });
    }
  } else return new Response("Action not allowed", { status: 403 });
  return NextResponse.redirect(new URL("/trades", request.url), 303);
}
