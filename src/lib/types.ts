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

export type Listing = {
  id: string;
  itemId: string;
  sellerId: string;
  askingPrice: number;
  openToTrades: boolean;
  note: string;
  status: ListingStatus;
  createdAt: string;
};

export type OfferTerms = { cash: number; itemIds: string[] };

export type Party = "buyer" | "seller";

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
