import "server-only";
import { cacheLife } from "next/cache";
import type { Card, CardSearchResult } from "./card";

const API = "https://api.pokemontcg.io/v2";
const FIELDS = "id,name,supertype,types,number,rarity,set,images,tcgplayer";
const PAGE_SIZE = 24;
const ATTEMPTS = 4;

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

// The upstream API intermittently returns 500/502, so retry with backoff.
async function request<T>(path: string): Promise<T> {
  const headers: HeadersInit = {};
  if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, { headers });
      if (res.ok) return (await res.json()) as T;
      if (res.status === 404) throw new TcgUnavailableError("Card not found");
      if (res.status < 500 && res.status !== 429) {
        throw new TcgUnavailableError(`Card search failed (${res.status})`);
      }
    } catch (error) {
      if (error instanceof TcgUnavailableError) throw error;
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
  }
  throw new TcgUnavailableError("The Pokemon TCG card database is not responding");
}

export async function searchCards(name: string, page: number): Promise<CardSearchResult> {
  "use cache";
  cacheLife("hours");

  const term = name.replace(/["\\*:()]/g, "").trim();
  const params = new URLSearchParams({
    q: `name:"${term}*"`,
    select: FIELDS,
    pageSize: String(PAGE_SIZE),
    page: String(page),
    orderBy: "-set.releaseDate",
  });
  const body = await request<{ data: ApiCard[]; page: number; totalCount: number }>(`/cards?${params}`);
  return { cards: body.data.map(toCard), page: body.page, totalCount: body.totalCount };
}

export async function getCard(id: string): Promise<Card> {
  "use cache";
  cacheLife("days");

  const body = await request<{ data: ApiCard }>(`/cards/${encodeURIComponent(id)}?select=${FIELDS}`);
  return toCard(body.data);
}
