import type { Exchange, ExchangeMethod, Listing, Party } from "./types";

export const METHOD_LABELS: Record<ExchangeMethod, string> = { pickup: "Pickup", dropoff: "Drop-off", ship: "Shipping" };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Like "Pickup or drop-off in Cerulean City, or shipping". */
export function methodsText({ exchangeMethods, area }: Pick<Listing, "exchangeMethods" | "area">) {
  const local = exchangeMethods.filter((x) => x !== "ship").map((x) => METHOD_LABELS[x].toLowerCase());
  const parts = local.length > 0 ? [`${local.join(" or ")}${area ? ` in ${area}` : ""}`] : [];
  if (exchangeMethods.includes("ship")) parts.push("shipping");
  return capitalize(parts.join(", or "));
}

/** `nameFor` gives "You" for the viewer, otherwise the collector's name. */
type NameFor = (party: Party) => string;

const payer = (paidBy: Party, nameFor: NameFor) => {
  const who = nameFor(paidBy);
  return who === "You" ? "you" : who;
};

/** Like "Pickup in Cerulean City" or "Shipping, Misty pays postage". */
export function exchangeLabel(exchange: Exchange, area: string, nameFor: NameFor) {
  if (exchange.method === "ship") {
    const who = payer(exchange.paidBy, nameFor);
    return `Shipping, ${who} ${who === "you" ? "pay" : "pays"} postage`;
  }
  return `${METHOD_LABELS[exchange.method]}${area ? ` in ${area}` : ""}`;
}

/** Fits after a price, like "$215, picked up in Cerulean City". */
export function exchangePhrase(exchange: Exchange, area: string, nameFor: NameFor) {
  if (exchange.method === "ship") return `shipped with ${payer(exchange.paidBy, nameFor)} paying postage`;
  const verb = exchange.method === "pickup" ? "picked up" : "dropped off";
  return `${verb} ${area ? `in ${area}` : "in person"}`;
}
