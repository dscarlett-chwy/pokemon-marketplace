"use server";

import type { MarketData, Result } from "@/lib/types";
import * as market from "@/server/marketplace";
import { getViewer, setViewer } from "@/server/viewer";

export type Synced = { result: Result; market: MarketData };

const synced = (result: Result): Synced => ({ result, market: market.loadMarket() });

export async function viewAs(userId: unknown): Promise<Synced> {
  if (typeof userId !== "string" || !market.isUser(userId)) {
    return synced({ ok: false, error: "That collector doesn't exist." });
  }
  await setViewer(userId);
  return synced({ ok: true, id: userId });
}

export async function addCard(cardId: unknown, condition: unknown, id: unknown) {
  return synced(await market.addCard(await getViewer(), cardId, condition, id));
}

export async function createListing(input: unknown, id: unknown) {
  return synced(market.createListing(await getViewer(), input, id));
}

export async function withdrawListing(listingId: unknown) {
  return synced(market.withdrawListing(await getViewer(), listingId));
}

export async function makeOffer(listingId: unknown, terms: unknown, message: unknown, id: unknown) {
  return synced(market.makeOffer(await getViewer(), listingId, terms, message, id));
}

export async function counterOffer(offerId: unknown, terms: unknown, message: unknown) {
  return synced(market.counterOffer(await getViewer(), offerId, terms, message));
}

export async function acceptOffer(offerId: unknown) {
  return synced(market.acceptOffer(await getViewer(), offerId));
}

export async function declineOffer(offerId: unknown) {
  return synced(market.declineOffer(await getViewer(), offerId));
}

export async function completeStep(offerId: unknown, step: unknown) {
  return synced(market.completeStep(await getViewer(), offerId, step));
}

export async function cancelTrade(offerId: unknown) {
  return synced(market.cancelTrade(await getViewer(), offerId));
}

export async function resetDemo() {
  market.resetDemo();
  const first = Object.keys(market.loadMarket().users)[0];
  await setViewer(first);
  return synced({ ok: true, id: first });
}
