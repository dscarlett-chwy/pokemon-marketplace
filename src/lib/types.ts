import type { Card } from "./card";

export type User = { id: string; name: string };

export const CONDITIONS = [
  "Mint",
  "Near mint",
  "Lightly played",
  "Moderately played",
  "Heavily played",
  "Damaged",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export type OwnedCard = {
  id: string;
  ownerId: string;
  cardId: string;
  condition: Condition;
};

export type ListingStatus = "active" | "sold" | "withdrawn";

export const EXCHANGE_METHODS = ["pickup", "dropoff", "ship"] as const;
export type ExchangeMethod = (typeof EXCHANGE_METHODS)[number];

export type Listing = {
  id: string;
  itemId: string;
  sellerId: string;
  askingPrice: number;
  openToTrades: boolean;
  exchangeMethods: ExchangeMethod[];
  /** Where the seller meets for pickup or drop-off, like a neighborhood or city. */
  area: string;
  note: string;
  status: ListingStatus;
  createdAt: string;
};

export type Party = "buyer" | "seller";

/** For pickup and drop-off, `meetup` is the proposed spot and time. */
export type Exchange = { method: "pickup" | "dropoff"; meetup: string } | { method: "ship"; paidBy: Party };

export type OfferTerms = { cash: number; itemIds: string[]; exchange: Exchange };

export type OfferRound = { by: Party; terms: OfferTerms; message: string; at: string };

export type OfferStatus = "pending" | "accepted" | "declined" | "closed";

export type Offer = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  rounds: OfferRound[];
  status: OfferStatus;
  closedReason: string | null;
  updatedAt: string;
};

export type Result = { ok: true; id: string } | { ok: false; error: string };

export type MarketData = {
  users: Record<string, User>;
  cards: Record<string, Card>;
  items: Record<string, OwnedCard>;
  listings: Record<string, Listing>;
  offers: Record<string, Offer>;
};
