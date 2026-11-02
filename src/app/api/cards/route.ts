import type { NextRequest } from "next/server";
import { getCard, searchCards, TcgUnavailableError } from "@/lib/tcg";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("id");
  const name = params.get("name")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  try {
    if (id) return Response.json(await getCard(id));
    if (name.length < 2) {
      return Response.json({ error: "Type at least 2 letters of a card name." }, { status: 400 });
    }
    return Response.json(await searchCards(name, page));
  } catch (error) {
    const message = error instanceof TcgUnavailableError ? error.message : "Card search failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
