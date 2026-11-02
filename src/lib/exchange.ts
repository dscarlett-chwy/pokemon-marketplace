import type { ExchangeMethod, Listing } from "./types";

export const METHOD_LABELS: Record<ExchangeMethod, string> = { pickup: "Pickup", dropoff: "Drop-off", ship: "Shipping" };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Like "Pickup or drop-off in Cerulean City, or shipping". */
export function methodsText({ exchangeMethods, area }: Pick<Listing, "exchangeMethods" | "area">) {
  const local = exchangeMethods.filter((x) => x !== "ship").map((x) => METHOD_LABELS[x].toLowerCase());
  const parts = local.length > 0 ? [`${local.join(" or ")}${area ? ` in ${area}` : ""}`] : [];
  if (exchangeMethods.includes("ship")) parts.push("shipping");
  return capitalize(parts.join(", or "));
}
