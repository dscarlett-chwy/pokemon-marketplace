"use server";

import type { MarketData, Result } from "@/lib/types";
import * as market from "@/server/marketplace";
import { getViewer } from "@/server/viewer";

export type Synced = { result: Result; market: MarketData };

const synced = (result: Result): Synced => ({ result, market: market.loadMarket() });

async function asViewer(run: (me: string) => Result | Promise<Result>): Promise<Synced> {
  const me = await getViewer();
  return synced(me ? await run(me) : { ok: false, error: "Sign in to do that." });
}

export async function addCard(cardId: unknown, condition: unknown, id: unknown) {
  return asViewer((me) => market.addCard(me, cardId, condition, id));
}

export async function createListing(input: unknown, id: unknown) {
  return asViewer((me) => market.createListing(me, input, id));
}

export async function withdrawListing(listingId: unknown) {
  return asViewer((me) => market.withdrawListing(me, listingId));
}

export async function makeOffer(listingId: unknown, terms: unknown, message: unknown, id: unknown) {
  return asViewer((me) => market.makeOffer(me, listingId, terms, message, id));
}

export async function counterOffer(offerId: unknown, terms: unknown, message: unknown) {
  return asViewer((me) => market.counterOffer(me, offerId, terms, message));
}

export async function acceptOffer(offerId: unknown) {
  return asViewer((me) => market.acceptOffer(me, offerId));
}

export async function declineOffer(offerId: unknown) {
  return asViewer((me) => market.declineOffer(me, offerId));
}

export async function completeStep(offerId: unknown, step: unknown) {
  return asViewer((me) => market.completeStep(me, offerId, step));
}

export async function cancelTrade(offerId: unknown) {
  return asViewer((me) => market.cancelTrade(me, offerId));
}

export async function resetDemo() {
  if (process.env.NODE_ENV === "production") {
    return synced({ ok: false, error: "Resetting the demo is only available in development." });
  }
  return asViewer((me) => {
    market.resetDemo();
    return { ok: true, id: me };
  });
}
