import type { Filters } from "../types";
import { emptyFilters } from "./match";

/** Serialise filters + query to a query string (no leading "?"). Shortlist is per-user and stays out. */
export function toSearch(f: Filters, query: string): string {
  const u = new URLSearchParams();
  if (query.trim()) u.set("q", query.trim());
  f.area.forEach((v) => u.append("area", v));
  f.bookSection.forEach((v) => u.append("section", v));
  f.type.forEach((v) => u.append("type", v));
  f.price.forEach((v) => u.append("price", String(v)));
  f.tags.forEach((v) => u.append("tag", v));
  if (f.opensLate) u.set("late", "1");
  if (f.opensByNineAm) u.set("early", "1");
  return u.toString();
}

export function fromSearch(search: string): { filters: Filters; query: string } {
  const u = new URLSearchParams(search);
  const f = emptyFilters();
  u.getAll("area").forEach((v) => f.area.add(v));
  u.getAll("section").forEach((v) => f.bookSection.add(v));
  u.getAll("type").forEach((v) => f.type.add(v));
  u.getAll("price").forEach((v) => {
    const n = Number(v);
    if ([0, 1, 2, 3].includes(n)) f.price.add(n);
  });
  u.getAll("tag").forEach((v) => f.tags.add(v));
  f.opensLate = u.get("late") === "1";
  f.opensByNineAm = u.get("early") === "1";
  return { filters: f, query: u.get("q") ?? "" };
}
