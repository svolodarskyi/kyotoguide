import type { Place, Taxonomy } from "../src/types";
import placesJson from "../src/data/places.json";
import taxonomyJson from "../src/data/taxonomy.json";
import { buildIndex, emptyFilters, match } from "../src/lib/match";
import { tokenize } from "../src/lib/normalize";
import type { Filters } from "../src/types";

export const places = placesJson as unknown as Place[];
export const taxonomy = taxonomyJson as unknown as Taxonomy;
const idx = new Map(places.map((p) => [p.id, buildIndex(p)]));

export function run(patch: Partial<Filters> = {}, query = "", shortlist: number[] = []): Place[] {
  const f = { ...emptyFilters(), ...patch };
  const tokens = tokenize(query);
  const sl = new Set(shortlist);
  return places.filter((p) => match(p, f, tokens, idx.get(p.id)!, sl));
}
