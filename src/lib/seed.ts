import type { Card } from "./card";
import seedCards from "./seed-cards.json";
import type { ExchangeMethod, Listing, MarketData, Offer, OwnedCard, User } from "./types";

export const USERS: User[] = [
  { id: "ash", name: "Ash" },
  { id: "misty", name: "Misty" },
];

export const SEED_CARDS: Record<string, Card> = Object.fromEntries(
  (seedCards as Card[]).map((card) => [card.id, card]),
);

const item = (id: string, ownerId: string, cardId: string, condition: OwnedCard["condition"]): OwnedCard => ({
  id,
  ownerId,
  cardId,
  condition,
});

export const SEED_ITEMS: OwnedCard[] = [
  item("i-ash-1", "ash", "sv3pt5-199", "Near mint"),
  item("i-ash-2", "ash", "base1-58", "Lightly played"),
  item("i-ash-3", "ash", "base1-15", "Lightly played"),
  item("i-ash-4", "ash", "base2-1", "Near mint"),
  item("i-ash-5", "ash", "xy12-11", "Near mint"),
  item("i-misty-1", "misty", "base1-2", "Near mint"),
  item("i-misty-2", "misty", "neo1-9", "Lightly played"),
  item("i-misty-3", "misty", "swsh7-215", "Near mint"),
  item("i-misty-4", "misty", "sv4pt5-232", "Mint"),
  item("i-misty-5", "misty", "swsh12pt5-160", "Near mint"),
  item("i-misty-6", "misty", "sm115-60", "Near mint"),
  item("i-misty-7", "misty", "base1-4", "Moderately played"),
];

const AREAS: Record<string, string> = { ash: "Pallet Town", misty: "Cerulean City" };

const listing = (
  id: string,
  itemId: string,
  sellerId: string,
  askingPrice: number,
  openToTrades: boolean,
  exchangeMethods: ExchangeMethod[],
  note: string,
  createdAt: string,
): Listing => ({
  id,
  itemId,
  sellerId,
  askingPrice,
  openToTrades,
  exchangeMethods,
  area: exchangeMethods.some((x) => x !== "ship") ? AREAS[sellerId] : "",
  note,
  status: "active",
  createdAt,
});

const ANY: ExchangeMethod[] = ["pickup", "dropoff", "ship"];

export const SEED_LISTINGS: Listing[] = [
  listing("l-1", "i-ash-1", "ash", 340, true, ANY, "Pulled it myself, sleeved straight from the pack.", "2026-10-30T15:00:00Z"),
  listing("l-2", "i-ash-5", "ash", 95, false, ["ship"], "", "2026-10-28T19:20:00Z"),
  listing("l-3", "i-misty-1", "misty", 235, true, ["pickup"], "Clean holo, light whitening on one corner.", "2026-10-31T13:05:00Z"),
  listing("l-4", "i-misty-2", "misty", 520, true, ["pickup", "ship"], "Unlimited print. Happy to look at vintage trades.", "2026-10-25T10:40:00Z"),
  listing("l-5", "i-misty-3", "misty", 2250, true, ["ship"], "", "2026-11-01T09:15:00Z"),
  listing("l-6", "i-misty-4", "misty", 880, false, ["pickup", "dropoff"], "Cash only on this one.", "2026-10-29T21:30:00Z"),
  listing("l-7", "i-misty-5", "misty", 42, true, ANY, "", "2026-11-01T17:45:00Z"),
  listing("l-8", "i-misty-7", "misty", 975, true, ["ship"], "Played but the holo still pops.", "2026-10-27T12:00:00Z"),
];

export const SEED_OFFERS: Offer[] = [
  {
    id: "o-1",
    listingId: "l-4",
    buyerId: "ash",
    sellerId: "misty",
    rounds: [
      {
        by: "buyer",
        terms: { cash: 400, itemIds: ["i-ash-2"] },
        message: "Would you take my Base Set Pikachu plus cash?",
        at: "2026-11-01T18:10:00Z",
      },
    ],
    status: "pending",
    closedReason: null,
    updatedAt: "2026-11-01T18:10:00Z",
  },
  {
    id: "o-2",
    listingId: "l-1",
    buyerId: "misty",
    sellerId: "ash",
    rounds: [{ by: "buyer", terms: { cash: 280, itemIds: [] }, message: "", at: "2026-11-01T20:02:00Z" }],
    status: "pending",
    closedReason: null,
    updatedAt: "2026-11-01T20:02:00Z",
  },
  {
    id: "o-3",
    listingId: "l-3",
    buyerId: "ash",
    sellerId: "misty",
    rounds: [
      { by: "buyer", terms: { cash: 180, itemIds: [] }, message: "", at: "2026-10-31T16:00:00Z" },
      {
        by: "seller",
        terms: { cash: 215, itemIds: [] },
        message: "Meet me at 215 and it ships tomorrow.",
        at: "2026-11-01T08:30:00Z",
      },
    ],
    status: "pending",
    closedReason: null,
    updatedAt: "2026-11-01T08:30:00Z",
  },
];

const byId = <T extends { id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.id, r]));

export const seedMarket = (): MarketData => ({
  users: byId(USERS),
  cards: { ...SEED_CARDS },
  items: byId(SEED_ITEMS),
  listings: byId(SEED_LISTINGS),
  offers: byId(SEED_OFFERS),
});
