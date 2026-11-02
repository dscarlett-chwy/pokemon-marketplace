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
  const client = await db();
  const result = await client.execute({
    sql: "UPDATE listings SET status = 'closed' WHERE id = ? AND owner_id = ? AND status = 'open'",
    args: [id, user.id],
  });
  if (!result.rowsAffected)
    return new Response("Listing not found or already closed", { status: 404 });
  await client.execute({
    sql: "UPDATE offers SET status = 'declined' WHERE listing_id = ? AND status = 'pending'",
    args: [id],
  });
  return NextResponse.redirect(new URL("/trades", request.url), 303);
}
