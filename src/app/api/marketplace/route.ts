import { loadMarket } from "@/server/marketplace";
import { getViewer } from "@/server/viewer";

export async function GET() {
  const currentUserId = await getViewer();
  return Response.json({ currentUserId, market: loadMarket() }, { headers: { "Cache-Control": "no-store" } });
}
