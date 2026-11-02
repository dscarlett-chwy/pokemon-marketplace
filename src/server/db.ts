import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { Card } from "@/lib/card";
import { seedMarket } from "@/lib/seed";
import type { Condition, ListingStatus, MarketData, OfferRound, OfferStatus } from "@/lib/types";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id),
    card_id TEXT NOT NULL REFERENCES cards(id),
    condition TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id),
    seller_id TEXT NOT NULL REFERENCES users(id),
    asking_price REAL NOT NULL,
    open_to_trades INTEGER NOT NULL,
    note TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id),
    buyer_id TEXT NOT NULL REFERENCES users(id),
    seller_id TEXT NOT NULL REFERENCES users(id),
    rounds TEXT NOT NULL,
    status TEXT NOT NULL,
    closed_reason TEXT,
    updated_at TEXT NOT NULL
  );
`;

type Table = keyof MarketData;
/** Parents before children, so inserts satisfy the foreign keys. */
const TABLES: Table[] = ["users", "cards", "items", "listings", "offers"];

const UPSERT: Record<Table, string> = {
  users: `INSERT INTO users (id, name) VALUES ($id, $name)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
  cards: `INSERT INTO cards (id, data) VALUES ($id, $data)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
  items: `INSERT INTO items (id, owner_id, card_id, condition) VALUES ($id, $ownerId, $cardId, $condition)
    ON CONFLICT(id) DO UPDATE SET owner_id = excluded.owner_id, card_id = excluded.card_id, condition = excluded.condition`,
  listings: `INSERT INTO listings (id, item_id, seller_id, asking_price, open_to_trades, note, status, created_at)
    VALUES ($id, $itemId, $sellerId, $askingPrice, $openToTrades, $note, $status, $createdAt)
    ON CONFLICT(id) DO UPDATE SET asking_price = excluded.asking_price, open_to_trades = excluded.open_to_trades,
      note = excluded.note, status = excluded.status`,
  offers: `INSERT INTO offers (id, listing_id, buyer_id, seller_id, rounds, status, closed_reason, updated_at)
    VALUES ($id, $listingId, $buyerId, $sellerId, $rounds, $status, $closedReason, $updatedAt)
    ON CONFLICT(id) DO UPDATE SET rounds = excluded.rounds, status = excluded.status,
      closed_reason = excluded.closed_reason, updated_at = excluded.updated_at`,
};

type Params = Record<string, SQLInputValue>;

const toParams = {
  users: (u: MarketData["users"][string]): Params => ({ ...u }),
  cards: (c: Card): Params => ({ id: c.id, data: JSON.stringify(c) }),
  items: (i: MarketData["items"][string]): Params => ({ ...i }),
  listings: (l: MarketData["listings"][string]): Params => ({ ...l, openToTrades: l.openToTrades ? 1 : 0 }),
  offers: (o: MarketData["offers"][string]): Params => ({ ...o, rounds: JSON.stringify(o.rounds) }),
};

type Row = Record<string, string | number | null>;

function open() {
  const path = resolve(process.env.DATABASE_PATH ?? "data/marketplace.db");
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (count === 0) transaction(db, () => writeChanges(db, emptyMarket(), seedMarket()));
  return db;
}

const globalForDb = globalThis as unknown as { marketplaceDb?: DatabaseSync };

export function getDb() {
  globalForDb.marketplaceDb ??= open();
  return globalForDb.marketplaceDb;
}

const emptyMarket = (): MarketData => ({ users: {}, cards: {}, items: {}, listings: {}, offers: {} });

export function transaction<T>(db: DatabaseSync, run: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = run();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const all = (db: DatabaseSync, sql: string) => db.prepare(sql).all() as Row[];

export function readMarket(db: DatabaseSync): MarketData {
  const market = emptyMarket();
  for (const r of all(db, "SELECT * FROM users")) {
    market.users[r.id as string] = { id: r.id as string, name: r.name as string };
  }
  for (const r of all(db, "SELECT * FROM cards")) {
    market.cards[r.id as string] = JSON.parse(r.data as string) as Card;
  }
  for (const r of all(db, "SELECT * FROM items ORDER BY rowid")) {
    market.items[r.id as string] = {
      id: r.id as string,
      ownerId: r.owner_id as string,
      cardId: r.card_id as string,
      condition: r.condition as Condition,
    };
  }
  for (const r of all(db, "SELECT * FROM listings ORDER BY rowid")) {
    market.listings[r.id as string] = {
      id: r.id as string,
      itemId: r.item_id as string,
      sellerId: r.seller_id as string,
      askingPrice: r.asking_price as number,
      openToTrades: r.open_to_trades === 1,
      note: r.note as string,
      status: r.status as ListingStatus,
      createdAt: r.created_at as string,
    };
  }
  for (const r of all(db, "SELECT * FROM offers ORDER BY rowid")) {
    market.offers[r.id as string] = {
      id: r.id as string,
      listingId: r.listing_id as string,
      buyerId: r.buyer_id as string,
      sellerId: r.seller_id as string,
      rounds: JSON.parse(r.rounds as string) as OfferRound[],
      status: r.status as OfferStatus,
      closedReason: r.closed_reason as string | null,
      updatedAt: r.updated_at as string,
    };
  }
  return market;
}

/** Saves every row that is new or was replaced between `before` and `after`. Rules never delete rows. */
export function writeChanges(db: DatabaseSync, before: MarketData, after: MarketData) {
  for (const table of TABLES) {
    const upsert = db.prepare(UPSERT[table]);
    const toRow = toParams[table] as (row: unknown) => Params;
    for (const [id, row] of Object.entries(after[table])) {
      if (before[table][id] !== row) upsert.run(toRow(row));
    }
  }
}

export function resetMarket(db: DatabaseSync) {
  transaction(db, () => {
    for (const table of [...TABLES].reverse()) db.exec(`DELETE FROM ${table}`);
    writeChanges(db, emptyMarket(), seedMarket());
  });
}
