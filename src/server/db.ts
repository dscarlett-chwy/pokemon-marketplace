import "server-only";
import postgres, { type Sql } from "postgres";
import type { Card } from "@/lib/card";
import { freeHandle, handleBase } from "@/lib/handle";
import type {
  Condition,
  ExchangeMethod,
  ListingStatus,
  MarketData,
  OfferRound,
  OfferStatus,
  Trade,
  User,
} from "@/lib/types";

/**
 * Row level security is on with no policies, so Supabase's public Data API can't read or write these
 * tables. The app connects as the table owner, which bypasses it.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
  );
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id),
    card_id TEXT NOT NULL REFERENCES cards(id),
    condition TEXT NOT NULL,
    seq BIGINT GENERATED ALWAYS AS IDENTITY
  );
  CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id),
    seller_id TEXT NOT NULL REFERENCES users(id),
    asking_price DOUBLE PRECISION NOT NULL,
    open_to_trades BOOLEAN NOT NULL,
    exchange_methods JSONB NOT NULL,
    area TEXT NOT NULL,
    note TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    seq BIGINT GENERATED ALWAYS AS IDENTITY
  );
  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id),
    buyer_id TEXT NOT NULL REFERENCES users(id),
    seller_id TEXT NOT NULL REFERENCES users(id),
    rounds JSONB NOT NULL,
    status TEXT NOT NULL,
    closed_reason TEXT,
    trade JSONB,
    updated_at TEXT NOT NULL,
    seq BIGINT GENERATED ALWAYS AS IDENTITY
  );
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS handle TEXT;
  ALTER TABLE items ADD COLUMN IF NOT EXISTS open_to_trade BOOLEAN NOT NULL DEFAULT true;
  ALTER TABLE offers ALTER COLUMN listing_id DROP NOT NULL;
`;

/** Runs after SCHEMA and the handle backfill, since existing users need unique handles first. */
const INDEXES = `
  CREATE UNIQUE INDEX IF NOT EXISTS users_handle_key ON users (handle);
`;

type Table = keyof MarketData;
/** Parents before children, so inserts satisfy the foreign keys. */
const TABLES: Table[] = ["users", "cards", "items", "listings", "offers"];

/** Columns each upsert may change. Ownership of listings and offers never moves. */
const UPDATABLE: Record<Table, string[]> = {
  users: ["name", "handle"],
  cards: ["data"],
  items: ["owner_id", "card_id", "condition", "open_to_trade"],
  listings: ["asking_price", "open_to_trades", "exchange_methods", "area", "note", "status"],
  offers: ["rounds", "status", "closed_reason", "trade", "updated_at"],
};

type Params = Record<string, unknown>;
/** The pool, or one transaction on it. */
type Db = postgres.ISql;

const toParams = {
  users: (u: MarketData["users"][string]): Params => ({ id: u.id, name: u.name, handle: u.handle }),
  cards: (c: Card): Params => ({ id: c.id, data: c }),
  items: (i: MarketData["items"][string]): Params => ({
    id: i.id,
    owner_id: i.ownerId,
    card_id: i.cardId,
    condition: i.condition,
    open_to_trade: i.openToTrade,
  }),
  listings: (l: MarketData["listings"][string]): Params => ({
    id: l.id,
    item_id: l.itemId,
    seller_id: l.sellerId,
    asking_price: l.askingPrice,
    open_to_trades: l.openToTrades,
    exchange_methods: l.exchangeMethods,
    area: l.area,
    note: l.note,
    status: l.status,
    created_at: l.createdAt,
  }),
  offers: (o: MarketData["offers"][string]): Params => ({
    id: o.id,
    listing_id: o.listingId,
    buyer_id: o.buyerId,
    seller_id: o.sellerId,
    rounds: o.rounds,
    status: o.status,
    closed_reason: o.closedReason,
    trade: o.trade,
    updated_at: o.updatedAt,
  }),
};

/** Vercel's Supabase integration adds a `supa` parameter that the pooler would reject as a startup setting. */
function connectionUrl() {
  const raw = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!raw) throw new Error("Set POSTGRES_URL to your Supabase connection string. See the README.");
  const url = new URL(raw);
  url.searchParams.delete("supa");
  return url.toString();
}

/** Every write takes this lock first, so rules always see the market as the previous write left it. */
const WRITE_LOCK = 7_310_431;

function open() {
  return postgres(connectionUrl(), {
    // Supabase's transaction pooler can't keep prepared statements or pipelined queries.
    prepare: false,
    max_pipeline: 1,
    query_timeout: 30,
    onnotice: false,
  });
}

const globalForDb = globalThis as unknown as { marketplaceDb?: Sql; marketplaceReady?: Promise<Sql> };

async function setUp(sql: Sql) {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${WRITE_LOCK})`;
    await tx.unsafe(SCHEMA);
    const missing = await tx<{ id: string; name: string }[]>`SELECT id, name FROM users WHERE handle IS NULL ORDER BY id`;
    for (const u of missing) await tx`UPDATE users SET handle = ${await newHandle(tx, u.name)} WHERE id = ${u.id}`;
    await tx.unsafe(INDEXES);
  });
  return sql;
}

async function newHandle(sql: Db, seed: string) {
  const base = handleBase(seed);
  const rows = await sql<{ handle: string }[]>`
    SELECT handle FROM users WHERE handle = ${base} OR handle LIKE ${`${base}-%`}
  `;
  return freeHandle(base, new Set(rows.map((r) => r.handle)));
}

export function getDb(): Promise<Sql> {
  globalForDb.marketplaceDb ??= open();
  globalForDb.marketplaceReady ??= setUp(globalForDb.marketplaceDb).catch((error) => {
    globalForDb.marketplaceReady = undefined;
    throw error;
  });
  return globalForDb.marketplaceReady;
}

const emptyMarket = (): MarketData => ({ users: {}, cards: {}, items: {}, listings: {}, offers: {} });

/** Runs `run` in one transaction that holds the write lock. */
export async function transaction<T>(run: (tx: Db) => Promise<T>): Promise<T> {
  const sql = await getDb();
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${WRITE_LOCK})`;
    return run(tx);
  }) as Promise<T>;
}

type Row = Record<string, unknown>;

export async function readMarket(sql: Db): Promise<MarketData> {
  const [users, cards, items, listings, offers] = await Promise.all([
    sql<Row[]>`SELECT * FROM users`,
    sql<Row[]>`SELECT * FROM cards`,
    sql<Row[]>`SELECT * FROM items ORDER BY seq`,
    sql<Row[]>`SELECT * FROM listings ORDER BY seq`,
    sql<Row[]>`SELECT * FROM offers ORDER BY seq`,
  ]);
  const market = emptyMarket();
  for (const r of users) {
    market.users[r.id as string] = { id: r.id as string, name: r.name as string, handle: (r.handle as string | null) ?? "" };
  }
  for (const r of cards) {
    market.cards[r.id as string] = r.data as Card;
  }
  for (const r of items) {
    market.items[r.id as string] = {
      id: r.id as string,
      ownerId: r.owner_id as string,
      cardId: r.card_id as string,
      condition: r.condition as Condition,
      openToTrade: r.open_to_trade as boolean,
    };
  }
  for (const r of listings) {
    market.listings[r.id as string] = {
      id: r.id as string,
      itemId: r.item_id as string,
      sellerId: r.seller_id as string,
      askingPrice: r.asking_price as number,
      openToTrades: r.open_to_trades as boolean,
      exchangeMethods: r.exchange_methods as ExchangeMethod[],
      area: r.area as string,
      note: r.note as string,
      status: r.status as ListingStatus,
      createdAt: r.created_at as string,
    };
  }
  for (const r of offers) {
    market.offers[r.id as string] = {
      id: r.id as string,
      listingId: r.listing_id as string | null,
      buyerId: r.buyer_id as string,
      sellerId: r.seller_id as string,
      rounds: r.rounds as OfferRound[],
      status: r.status as OfferStatus,
      closedReason: r.closed_reason as string | null,
      trade: r.trade as Trade | null,
      updatedAt: r.updated_at as string,
    };
  }
  return market;
}

/** Saves every row that is new or was replaced between `before` and `after`. Rules never delete rows. */
export async function writeChanges(sql: Db, before: MarketData, after: MarketData) {
  for (const table of TABLES) {
    const toRow = toParams[table] as (row: unknown) => Params;
    const rows = Object.entries(after[table])
      .filter(([id, row]) => before[table][id] !== row)
      .map(([, row]) => toRow(row));
    if (rows.length === 0) continue;
    const updates = UPDATABLE[table].map((c) => sql`${sql(c)} = excluded.${sql(c)}`);
    await sql`
      INSERT INTO ${sql(table)} ${sql(rows)}
      ON CONFLICT (id) DO UPDATE SET ${sql`, `.join(updates)}
    `;
  }
}

export async function isUser(userId: string) {
  const sql = await getDb();
  const rows = await sql`SELECT 1 FROM users WHERE id = ${userId}`;
  return rows.length > 0;
}

export async function userByHandle(handle: string): Promise<User | null> {
  const sql = await getDb();
  const [row] = await sql<User[]>`SELECT id, name, handle FROM users WHERE handle = ${handle}`;
  return row ? { id: row.id, name: row.name, handle: row.handle } : null;
}

/** `handleSeed` is what the new handle is made from, like a username or display name. */
export async function addUser(userId: string, name: string, handleSeed: string) {
  await transaction(async (tx) => {
    if ((await tx`SELECT 1 FROM users WHERE id = ${userId}`).length > 0) return;
    const handle = await newHandle(tx, handleSeed);
    await tx`INSERT INTO users (id, name, handle) VALUES (${userId}, ${name}, ${handle})`;
  });
}
