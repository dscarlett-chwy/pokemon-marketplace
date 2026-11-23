/** Public names for profile links, like "misty" or "brock-2". Clerk ids never appear in URLs. */
export const HANDLE_MAX = 20;

const PATTERN = new RegExp(`^[a-z0-9][a-z0-9-]{1,${HANDLE_MAX - 2}}[a-z0-9]$`);

export const isHandle = (v: string) => PATTERN.test(v) && !v.includes("--");

/** A starting point for a new collector's handle. A number is added if it's taken. */
export function handleBase(seed: string) {
  const slug = seed
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HANDLE_MAX - 4)
    .replace(/-+$/, "");
  return slug.length >= 3 ? slug : "collector";
}

/** The first of `base`, `base-2`, `base-3`... that isn't in `taken`. */
export function freeHandle(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}
