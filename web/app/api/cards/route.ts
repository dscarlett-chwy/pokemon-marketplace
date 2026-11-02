import { searchCards } from "@/lib/cards";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.length > 60)
    return Response.json({ error: "Search is too long" }, { status: 400 });
  try {
    return Response.json({ cards: await searchCards(query) });
  } catch {
    return Response.json(
      { error: "Card catalog is temporarily unavailable" },
      { status: 503 },
    );
  }
}
