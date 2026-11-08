import type { Place, Taxonomy } from "../types";

export const BOUNDS = { latMin: 34.9, latMax: 35.1, lngMin: 135.65, lngMax: 135.85 };

/** Returns a list of human-readable problems; empty means the data is valid. */
export function validateData(places: Place[], tax: Taxonomy): string[] {
  const errs: string[] = [];
  const types = new Set(tax.types.map((t) => t.name));
  const areas = new Set(tax.areas.map((a) => a.name));
  const tags = new Set(tax.tags.map((t) => t.name));
  const sections = new Map(tax.bookSections.map((s) => [s.name, s]));

  places.forEach((p, i) => {
    const at = `place #${p.id} (${p.name})`;
    if (p.id !== i + 1) errs.push(`${at}: id not contiguous (expected ${i + 1})`);
    if (!p.name) errs.push(`${at}: empty name`);
    if (!types.has(p.type)) errs.push(`${at}: unknown type "${p.type}"`);
    if (!areas.has(p.area)) errs.push(`${at}: unknown area "${p.area}"`);
    for (const t of p.tags) if (!tags.has(t)) errs.push(`${at}: unknown tag "${t}"`);
    if (new Set(p.tags).size !== p.tags.length) errs.push(`${at}: duplicate tags`);
    const s = sections.get(p.bookSection);
    if (!s) errs.push(`${at}: unknown bookSection "${p.bookSection}"`);
    else if (p.id < s.idRange[0] || p.id > s.idRange[1])
      errs.push(`${at}: id outside range of section "${s.name}"`);
    if (![0, 1, 2, 3].includes(p.priceTier)) errs.push(`${at}: bad priceTier ${p.priceTier}`);
    if (![0, 1, 2].includes(p.hoursConflict)) errs.push(`${at}: bad hoursConflict`);
    const { lat, lng } = p;
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < BOUNDS.latMin || lat > BOUNDS.latMax || lng < BOUNDS.lngMin || lng > BOUNDS.lngMax
    )
      errs.push(`${at}: coordinates out of bounds (${lat}, ${lng})`);
    if (!p.googlePlaceId) errs.push(`${at}: missing googlePlaceId`);
  });

  for (const t of tax.types) {
    const n = places.filter((p) => p.type === t.name).length;
    if (n !== t.count) errs.push(`taxonomy count for type "${t.name}" is ${t.count}, data has ${n}`);
  }
  for (const a of tax.areas) {
    const n = places.filter((p) => p.area === a.name).length;
    if (n !== a.count) errs.push(`taxonomy count for area "${a.name}" is ${a.count}, data has ${n}`);
  }
  for (const t of tax.tags) {
    const n = places.filter((p) => p.tags.includes(t.name)).length;
    if (n !== t.count) errs.push(`taxonomy count for tag "${t.name}" is ${t.count}, data has ${n}`);
  }
  return errs;
}
