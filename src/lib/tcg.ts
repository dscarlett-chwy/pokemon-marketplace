import "server-only";
import { cacheLife } from "next/cache";
import type { Card, CardSearchResult } from "./card";

const API = "https://api.pokemontcg.io/v2";
const FIELDS = "id,name,supertype,types,number,rarity,set,images,tcgplayer";
const PAGE_SIZE = 24;
const ATTEMPTS = 6;

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

async function fetchJson<T>(path: string): Promise<T> {
  const headers: HeadersInit = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

// Errors thrown inside "use cache" lose their class, so retries and error typing
// happen out here; only successful responses get cached.
async function withRetry<T>(load: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await load();
    } catch (error) {
      const status = Number((error as Error).message);
      if (status === 404) throw new TcgUnavailableError("Card not found");
      if (status >= 400 && status < 500 && status !== 429) throw new TcgUnavailableError(`Card search failed (${status})`);
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 250 * attempt));
  }
  throw new TcgUnavailableError("The Pokemon card catalog isn't responding right now");
}

async function searchCardsCached(term: string, page: number): Promise<CardSearchResult> {
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
  return { cards: body.data.map(toCard), page: body.page, totalCount: body.totalCount };
}

async function getCardCached(id: string): Promise<Card> {
  "use cache";
  cacheLife("days");

  const body = await fetchJson<{ data: ApiCard }>(`/cards/${encodeURIComponent(id)}?select=${FIELDS}`);
  return toCard(body.data);
}

export function searchCards(name: string, page: number) {
  const term = name.replace(/["\\*:()]/g, "").trim();
  return withRetry(() => searchCardsCached(term, page));
}

export function getCard(id: string) {
  return withRetry(() => getCardCached(id));
}
