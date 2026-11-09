import type { Place } from "../types";

export function mapsUrl(p: Pick<Place, "name" | "googlePlaceId">): string {
  const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${p.name} Kyoto`);
  return p.googlePlaceId ? url + "&query_place_id=" + encodeURIComponent(p.googlePlaceId) : url;
}

export function priceLabel(tier: number): string {
  return tier === 0 ? "Free" : "¥".repeat(tier);
}

export function shortlistText(places: readonly Place[]): string {
  return places
    .map((p) => `${p.name}\n${p.address}, ${p.area}\n${p.hoursBook}\n${mapsUrl(p)}`)
    .join("\n\n");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
