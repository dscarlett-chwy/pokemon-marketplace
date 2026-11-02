import "server-only";
import { db } from "./db";

export const conditions = [
  "Near mint",
  "Lightly played",
  "Moderately played",
  "Heavily played",
  "Damaged",
] as const;
export type Listing = {
  id: string;
  owner_id: string;
  card_id: string;
  card_name: string;
  card_image: string;
  card_set: string;
  card_number: string;
  card_condition: string;
  looking_for: string;
  description: string;
  status: string;
  created_at: number;
  owner_name?: string;
};
export type Offer = {
  id: string;
  listing_id: string;
  sender_id: string;
  card_id: string;
  card_name: string;
  card_image: string;
  card_set: string;
  card_condition: string;
  message: string;
  status: string;
  created_at: number;
  sender_name?: string;
  sender_email?: string;
  listing_name?: string;
  listing_image?: string;
  owner_email?: string;
};

export function validCondition(
  value: string,
): value is (typeof conditions)[number] {
  return conditions.includes(value as (typeof conditions)[number]);
}

export async function browseListings(query = "", condition = "") {
  const result = await (
    await db()
  ).execute({
    sql: `SELECT l.*, u.display_name AS owner_name FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.status = 'open' AND (? = '' OR l.card_name LIKE ? OR l.card_set LIKE ? OR l.looking_for LIKE ?) AND (? = '' OR l.card_condition = ?) ORDER BY l.created_at DESC LIMIT 48`,
    args: [
      query,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      condition,
      condition,
    ],
  });
  return result.rows as unknown as Listing[];
}

export async function getListing(id: string) {
  const result = await (
    await db()
  ).execute({
    sql: `SELECT l.*, u.display_name AS owner_name FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.id = ?`,
    args: [id],
  });
  return (result.rows[0] as unknown as Listing | undefined) ?? null;
}

export async function myListings(userId: string) {
  const result = await (
    await db()
  ).execute({
    sql: "SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows as unknown as Listing[];
}

export async function myOffers(userId: string) {
  const result = await (
    await db()
  ).execute({
    sql: "SELECT o.*, l.card_name AS listing_name, l.card_image AS listing_image, u.email AS owner_email FROM offers o JOIN listings l ON l.id = o.listing_id JOIN users u ON u.id = l.owner_id WHERE o.sender_id = ? ORDER BY o.created_at DESC",
    args: [userId],
  });
  return result.rows as unknown as Offer[];
}

export async function incomingOffers(userId: string) {
  const result = await (
    await db()
  ).execute({
    sql: "SELECT o.*, l.card_name AS listing_name, u.display_name AS sender_name, u.email AS sender_email FROM offers o JOIN listings l ON l.id = o.listing_id JOIN users u ON u.id = o.sender_id WHERE l.owner_id = ? ORDER BY o.created_at DESC",
    args: [userId],
  });
  return result.rows as unknown as Offer[];
}
