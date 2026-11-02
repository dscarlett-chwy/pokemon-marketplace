import "server-only";
import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

let client: Client | undefined;
let ready: Promise<Client> | undefined;

export function db(): Promise<Client> {
  if (!ready) {
    ready = (async () => {
      const url =
        process.env.DATABASE_URL ??
        (process.env.NODE_ENV === "production"
          ? ""
          : "file:./data/marketplace.db");
      if (!url) throw new Error("DATABASE_URL is required in production.");
      if (url.startsWith("file:"))
        mkdirSync(join(process.cwd(), "data"), { recursive: true });
      client ??= createClient({
        url,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      });
      await client.batch(
        [
          `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, display_name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), card_id TEXT NOT NULL, card_name TEXT NOT NULL, card_image TEXT NOT NULL, card_set TEXT NOT NULL, card_number TEXT NOT NULL, card_condition TEXT NOT NULL, looking_for TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL)`,
          `CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id), sender_id TEXT NOT NULL REFERENCES users(id), card_id TEXT NOT NULL, card_name TEXT NOT NULL, card_image TEXT NOT NULL, card_set TEXT NOT NULL, card_condition TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL)`,
          `CREATE INDEX IF NOT EXISTS listings_status_created ON listings(status, created_at)`,
          `CREATE INDEX IF NOT EXISTS offers_listing ON offers(listing_id)`,
          `CREATE INDEX IF NOT EXISTS offers_sender ON offers(sender_id)`,
        ],
        "write",
      );
      return client;
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}
