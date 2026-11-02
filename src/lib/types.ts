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

/** "trading" means an accepted offer is being carried out; the listing reopens if that trade is cancelled. */
export type ListingStatus = "active" | "trading" | "sold" | "withdrawn";

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

/** What one side adds. The seller always gives the listed card, so `itemIds` holds only extra cards. */
export type Side = { cash: number; itemIds: string[] };

export const PAYMENT_METHODS = ["in_person", "online"] as const;
/** "online" is a simulated hold: the payer pays Trade Binder, which releases it when the trade completes. */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** `payment` is null when no cash changes hands. */
export type OfferTerms = { buyer: Side; seller: Side; exchange: Exchange; payment: PaymentMethod | null };

export type OfferRound = { by: Party; terms: OfferTerms; message: string; at: string };

export type OfferStatus = "pending" | "accepted" | "declined" | "closed";

export const TRADE_STEPS = ["pay", "send", "receive"] as const;
/** "send" covers shipping or handing over cards, plus cash when paying in person. */
export type TradeStep = (typeof TRADE_STEPS)[number];

export type TradeStatus = "active" | "complete" | "cancelled";

export type Trade = {
  status: TradeStatus;
  done: Record<Party, TradeStep[]>;
  cancelledBy: Party | null;
  startedAt: string;
};

export type Offer = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  rounds: OfferRound[];
  status: OfferStatus;
  closedReason: string | null;
  /** Set when the offer is accepted. Cards change owners only when the trade completes. */
  trade: Trade | null;
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
