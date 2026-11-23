import { marketFor } from "@/server/marketplace";
import { getViewer } from "@/server/viewer";

export async function GET() {
  const currentUserId = await getViewer();
  return Response.json({ currentUserId, market: await marketFor(currentUserId) }, { headers: { "Cache-Control": "no-store" } });
}
