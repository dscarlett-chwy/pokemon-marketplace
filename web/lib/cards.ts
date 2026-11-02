export type Card = {
  id: string;
  name: string;
  image: string;
  set: string;
  number: string;
};
type TcgCard = {
  id?: string;
  name?: string;
  image?: string;
  localId?: string;
  set?: { name?: string };
};
const API = "https://api.tcgdex.net/v2/en/cards";

export async function searchCards(query: string): Promise<Card[]> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  const response = await fetch(`${API}?name=${encodeURIComponent(q)}`, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Card catalog is unavailable");
  const cards = (await response.json()) as TcgCard[];
  return cards
    .filter((card) => card.id && card.name && card.image)
    .slice(0, 24)
    .map((card) => ({
      id: card.id!,
      name: card.name!,
      image: `${card.image}/low.webp`,
      set: "",
      number: card.localId ?? "",
    }));
}

export async function getCard(id: string): Promise<Card | null> {
  if (!/^[a-zA-Z0-9-]{2,64}$/.test(id)) return null;
  const response = await fetch(`${API}/${encodeURIComponent(id)}`, {
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;
  const card = (await response.json()) as TcgCard;
  if (!card.id || !card.name || !card.image || !card.set?.name) return null;
  return {
    id: card.id,
    name: card.name,
    image: `${card.image}/high.webp`,
    set: card.set.name,
    number: card.localId ?? "",
  };
}
