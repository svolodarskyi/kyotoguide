import type { Place, Taxonomy } from "../types";
import placesJson from "./places.json";
import taxonomyJson from "./taxonomy.json";

export const places = placesJson as unknown as Place[];
export const taxonomy = taxonomyJson as unknown as Taxonomy;
export const typeIndex = new Map(taxonomy.types.map((t, i) => [t.name, i]));
/** CSS colour for a place type; defined per theme in main.tsx. */
export const typeColor = (type: string) => `var(--type-${typeIndex.get(type) ?? 0})`;
