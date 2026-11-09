import type { Filters, Place } from "../types";
import { normalize } from "./normalize";

export function emptyFilters(): Filters {
  return {
    area: new Set(),
    bookSection: new Set(),
    type: new Set(),
    price: new Set(),
    tags: new Set(),
    opensLate: false,
    opensByNineAm: false,
    shortlist: false,
  };
}

export function hasActiveFilters(f: Filters, query: string): boolean {
  return (
    query.trim() !== "" ||
    f.area.size > 0 ||
    f.bookSection.size > 0 ||
    f.type.size > 0 ||
    f.price.size > 0 ||
    f.tags.size > 0 ||
    f.opensLate ||
    f.opensByNineAm ||
    f.shortlist
  );
}

/** Searchable text for one place, built once at load. Plain substring matching. */
export function buildIndex(p: Place): string {
  const price = p.priceTier === 0 ? "free" : "¥".repeat(p.priceTier);
  return normalize(
    [
      p.name, p.nameJp, p.area, p.type, p.bookSection, p.station, p.address,
      p.summary, p.bookPicks, p.tags.join(" "), p.bookTagline, p.bookText,
      p.hoursBook, p.closedDaysBook, price,
    ]
      .filter(Boolean)
      .join(" \n "),
  );
}

/**
 * OR within a group, AND across groups, AND for tags, AND for every search token.
 * `tokens` must already be normalised (see tokenize()).
 */
export function match(
  p: Place,
  f: Filters,
  tokens: readonly string[],
  index: string,
  shortlist: ReadonlySet<number>,
): boolean {
  if (f.area.size && !f.area.has(p.area)) return false;
  if (f.bookSection.size && !(p.bookSection && f.bookSection.has(p.bookSection))) return false;
  if (f.type.size && !f.type.has(p.type)) return false;
  if (f.price.size && !f.price.has(p.priceTier)) return false;
  for (const t of f.tags) if (!p.tags.includes(t)) return false;
  if (f.opensLate && !p.opensLate) return false;
  if (f.opensByNineAm && !p.opensByNineAm) return false;
  if (f.shortlist && !shortlist.has(p.id)) return false;
  return tokens.every((t) => index.includes(t));
}

/** Chip counts over the whole dataset (not the filtered set). */
export function countBy<T>(places: readonly Place[], keys: (p: Place) => T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const p of places) for (const k of keys(p)) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}
