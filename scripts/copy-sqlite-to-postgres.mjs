// Copies the marketplace from the old SQLite file into Postgres, replacing what Postgres holds.
// Start the app against Postgres once first so its tables exist.
//
//   POSTGRES_URL=... node scripts/copy-sqlite-to-postgres.mjs [path/to/marketplace.db]

import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";

const SQLITE_VERSION = 5;
/** Parents before children, so inserts satisfy the foreign keys. */
const TABLES = ["users", "cards", "items", "listings", "offers"];
const JSON_COLUMNS = new Set(["data", "exchange_methods", "rounds", "trade"]);
const BOOLEAN_COLUMNS = new Set(["open_to_trades"]);

const file = process.argv[2] ?? "data/marketplace.db";
const raw = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
if (!raw) throw new Error("Set POSTGRES_URL to the database to copy into.");

const lite = new DatabaseSync(file, { readOnly: true });
const { user_version: version } = lite.prepare("PRAGMA user_version").get();
if (version !== SQLITE_VERSION) {
  throw new Error(`${file} is at version ${version}; run the SQLite version of the app once to bring it to ${SQLITE_VERSION}.`);
}

const toRow = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([column, value]) => [
      column,
      value !== null && JSON_COLUMNS.has(column) ? JSON.parse(value) : BOOLEAN_COLUMNS.has(column) ? value === 1 : value,
    ]),
  );

const url = new URL(raw);
url.searchParams.delete("supa");
const sql = postgres(url.toString(), { prepare: false, max_pipeline: 1, max: 1, onnotice: false });

try {
  await sql.begin(async (tx) => {
    for (const table of [...TABLES].reverse()) await tx`DELETE FROM ${tx(table)}`;
    for (const table of TABLES) {
      const rows = lite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all().map(toRow);
      if (rows.length > 0) await tx`INSERT INTO ${tx(table)} ${tx(rows)}`;
      console.log(`${table}: ${rows.length}`);
    }
  });
  console.log("Copied.");
} finally {
  await sql.end();
}
