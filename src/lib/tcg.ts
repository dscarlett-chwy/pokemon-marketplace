import "server-only";
import { cacheLife } from "next/cache";
import type { Card, CardSearchResult } from "./card";

const API = "https://api.pokemontcg.io/v2";
const FIELDS = "id,name,supertype,types,number,rarity,set,images,tcgplayer";
const PAGE_SIZE = 24;
const ATTEMPTS = 6;
const TIMEOUT_MS = 8000;

type ApiCard = {
  id: string;
  name: string;
  supertype: string;
  types?: string[];
  number: string;
  rarity?: string;
  set: { id: string; name: string; series: string; releaseDate: string };
  images: { small: string; large: string };
  tcgplayer?: { prices?: Record<string, { market?: number | null }> };
};

export class TcgUnavailableError extends Error {}

function toCard(c: ApiCard): Card {
  const prices = Object.values(c.tcgplayer?.prices ?? {});
  const market = prices.map((p) => p.market).find((m): m is number => typeof m === "number");
  return {
    id: c.id,
    name: c.name,
    supertype: c.supertype,
    types: c.types ?? [],
    number: c.number,
    rarity: c.rarity ?? null,
    set: { id: c.set.id, name: c.set.name, series: c.set.series, releaseDate: c.set.releaseDate },
    images: c.images,
    marketPrice: market ?? null,
  };
}

// Retries run here, inside the "use cache" functions: in production, once a cached
// call throws, calling it again in the same request rethrows that error without
// refetching, and the error's message and class are stripped. Returns null on 404.
async function fetchJson<T>(path: string): Promise<T | null> {
  const headers: HeadersInit = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  const failures: string[] = [];
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      // The signal also opts out of fetch deduplication, which would otherwise
      // hand every retry the same failed response.
      const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) return (await res.json()) as T;
      if (res.status === 404) return null;
      failures.push(String(res.status));
      if (res.status < 500 && res.status !== 429) break;
    } catch (error) {
      failures.push((error as Error).name === "TimeoutError" ? "timeout" : (error as Error).message);
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 250 * attempt));
  }
  console.error(`Pokemon TCG API failed for ${path}: ${failures.join(", ")}`);
  throw new Error("Pokemon TCG API unavailable");
}

async function load<T>(cached: () => Promise<T | null>): Promise<T> {
  let result: T | null;
  try {
    result = await cached();
  } catch {
    throw new TcgUnavailableError("The Pokemon card catalog isn't responding right now");
  }
  if (result === null) throw new TcgUnavailableError("Card not found");
  return result;
}

async function searchCardsCached(term: string, page: number): Promise<CardSearchResult | null> {
  "use cache";
  cacheLife("hours");

  const params = new URLSearchParams({
    q: `name:"${term}*"`,
    select: FIELDS,
    pageSize: String(PAGE_SIZE),
    page: String(page),
    orderBy: "-set.releaseDate",
  });
  const body = await fetchJson<{ data: ApiCard[]; page: number; totalCount: number }>(`/cards?${params}`);
  return body && { cards: body.data.map(toCard), page: body.page, totalCount: body.totalCount };
}

async function getCardCached(id: string): Promise<Card | null> {
  "use cache";
  cacheLife("days");

  const body = await fetchJson<{ data: ApiCard }>(`/cards/${encodeURIComponent(id)}?select=${FIELDS}`);
  return body && toCard(body.data);
}

export function searchCards(name: string, page: number) {
  const term = name.replace(/["\\*:()]/g, "").trim();
  return load(() => searchCardsCached(term, page));
}

export function getCard(id: string) {
  return load(() => getCardCached(id));
}
