export type Card = {
  id: string;
  name: string;
  supertype: string;
  types: string[];
  number: string;
  rarity: string | null;
  set: { id: string; name: string; series: string; releaseDate: string };
  images: { small: string; large: string };
  marketPrice: number | null;
};

export type CardSearchResult = { cards: Card[]; page: number; totalCount: number };
