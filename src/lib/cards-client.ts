import type { CardSearchResult } from "./card";

export async function fetchCardSearch(name: string, signal?: AbortSignal): Promise<CardSearchResult> {
  const res = await fetch(`/api/cards?name=${encodeURIComponent(name)}`, { signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Card search failed");
  return body as CardSearchResult;
}
