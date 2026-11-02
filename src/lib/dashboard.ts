import type { Card } from "./card";
import { formatMoney } from "./format";
import { latestTerms, needsAction, partyOf, tradeSteps } from "./marketplace-rules";
import type { Listing, MarketData, Offer, OfferTerms, OwnedCard, Party, Side, User } from "./types";

export type Bucket = "pending" | "in-progress" | "completed" | "declined" | "closed";

export const BUCKETS: { bucket: Bucket; label: string }[] = [
  { bucket: "pending", label: "Pending" },
  { bucket: "in-progress", label: "In progress" },
  { bucket: "completed", label: "Completed" },
  { bucket: "declined", label: "Declined" },
  { bucket: "closed", label: "Closed" },
];

/** Accepted offers split by how their trade checklist ended. Cancelled trades count as closed. */
export function bucketOf(offer: Offer): Bucket {
  if (offer.status === "accepted") {
    if (offer.trade?.status === "complete") return "completed";
    if (offer.trade?.status === "cancelled") return "closed";
    return "in-progress";
  }
  return offer.status;
}

export type DealRow = {
  offer: Offer;
  listing: Listing;
  item: OwnedCard;
  card: Card;
  other: User;
  party: Party;
  bucket: Bucket;
  terms: OfferTerms;
  myTurn: boolean;
  steps: { done: number; total: number };
};

export function dealRows(m: MarketData, me: string): DealRow[] {
  return Object.values(m.offers)
    .flatMap((offer) => {
      const party = partyOf(offer, me);
      const listing = m.listings[offer.listingId];
      const item = listing && m.items[listing.itemId];
      const card = item && m.cards[item.cardId];
      if (!party || !card) return [];
      const steps = tradeSteps(offer);
      return [
        {
          offer,
          listing,
          item,
          card,
          other: m.users[party === "seller" ? offer.buyerId : offer.sellerId],
          party,
          bucket: bucketOf(offer),
          terms: latestTerms(offer),
          myTurn: needsAction(offer, me),
          steps: { done: steps.filter((s) => s.done).length, total: steps.length },
        },
      ];
    })
    .sort((a, b) => Number(b.myTurn) - Number(a.myTurn) || b.offer.updatedAt.localeCompare(a.offer.updatedAt));
}

export function sideText(side: Side) {
  const cards = side.itemIds.length === 1 ? "1 card" : `${side.itemIds.length} cards`;
  if (side.itemIds.length === 0) return formatMoney(side.cash);
  if (side.cash === 0) return cards;
  return `${formatMoney(side.cash)} + ${cards}`;
}

export const sellerAdds = (terms: OfferTerms) => terms.seller.cash > 0 || terms.seller.itemIds.length > 0;

/** Cash the seller ends up with: what the buyer paid minus anything the seller added. */
export const netCash = (terms: OfferTerms) => terms.buyer.cash - terms.seller.cash;

export function dashboardStats(listings: Record<string, Listing>, me: string, rows: DealRow[]) {
  const sales = rows
    .filter((r) => r.party === "seller" && r.bucket === "completed")
    .sort((a, b) => b.offer.updatedAt.localeCompare(a.offer.updatedAt));
  return {
    sales,
    cashFromSales: sales.reduce((sum, r) => sum + netCash(r.terms), 0),
    cardsSold: sales.length,
    cardsReceived: sales.reduce((sum, r) => sum + r.terms.buyer.itemIds.length, 0),
    activeListings: Object.values(listings).filter((l) => l.sellerId === me && l.status === "active").length,
    waitingOnMe: rows.filter((r) => r.myTurn).length,
  };
}
