import { describe, expect, it } from "vitest";
import { countBy } from "../src/lib/match";
import { normalize, tokenize } from "../src/lib/normalize";
import { fromSearch, toSearch } from "../src/lib/urlState";
import { emptyFilters } from "../src/lib/match";
import { loadShortlist, saveShortlist } from "../src/lib/shortlist";
import { mapsUrl } from "../src/lib/links";
import { places, run } from "./helpers";

const ids = (ps: { id: number }[]) => ps.map((p) => p.id);

describe("normalize", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalize("François")).toBe("francois");
    expect(normalize("Kyōto  Ōhara")).toBe("kyoto  ohara");
    expect(tokenize("  Matcha   Gion ")).toEqual(["matcha", "gion"]);
  });
});

describe("match()", () => {
  it("returns everything with no filters", () => {
    expect(run()).toHaveLength(79);
  });
  it("ORs within a group", () => {
    const a = run({ type: new Set(["Kissaten"]) });
    const b = run({ type: new Set(["Garden café"]) });
    const ab = run({ type: new Set(["Kissaten", "Garden café"]) });
    expect(ab).toHaveLength(a.length + b.length);
    expect(a.length).toBeGreaterThan(0);
  });
  it("ORs price tiers", () => {
    const r = run({ price: new Set([0, 3]) });
    expect(r.every((p) => p.priceTier === 0 || p.priceTier === 3)).toBe(true);
    expect(r.length).toBe(places.filter((p) => p.priceTier === 0 || p.priceTier === 3).length);
  });
  it("ANDs across groups", () => {
    const r = run({ type: new Set(["Temples & shrines"]), tags: new Set(["Autumn colours"]) });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.type === "Temples & shrines" && p.tags.includes("Autumn colours"))).toBe(true);
    const all = run({ type: new Set(["Temples & shrines"]) });
    expect(r.length).toBeLessThanOrEqual(all.length);
  });
  it("ANDs tags within the Features group", () => {
    const m = run({ tags: new Set(["Matcha"]) });
    const g = run({ tags: new Set(["Garden view"]) });
    const both = run({ tags: new Set(["Matcha", "Garden view"]) });
    expect(both.every((p) => p.tags.includes("Matcha") && p.tags.includes("Garden view"))).toBe(true);
    expect(both.length).toBeLessThan(Math.min(m.length, g.length) + 1);
  });
  it("applies hour toggles and shortlist", () => {
    expect(run({ opensLate: true })).toHaveLength(14);
    expect(run({ opensByNineAm: true })).toHaveLength(15);
    expect(ids(run({ shortlist: true }, "", [3, 5, 200]))).toEqual([3, 5]);
    expect(run({ shortlist: true })).toHaveLength(0);
  });
  it("search ignores accents and finds book text", () => {
    const withAccent = places.filter((p) => /François/.test(p.bookText ?? ""));
    expect(withAccent.length).toBeGreaterThan(0);
    expect(ids(run({}, "Francois"))).toEqual(expect.arrayContaining(ids(withAccent)));
    expect(run({}, "FRANÇOIS").length).toBe(run({}, "francois").length);
  });
  it("search tokens are ANDed and combine with filters", () => {
    const one = run({}, "matcha");
    const two = run({}, "matcha gion");
    expect(two.length).toBeLessThan(one.length);
    const filtered = run({ type: new Set(["Tea & sweets"]) }, "matcha");
    expect(filtered.every((p) => p.type === "Tea & sweets")).toBe(true);
    expect(run({}, "zzzzqqq")).toHaveLength(0);
  });
  it("searches price text", () => {
    expect(run({}, "free").length).toBeGreaterThanOrEqual(places.filter((p) => p.priceTier === 0).length);
  });
});

describe("counts", () => {
  it("chip counts are over the whole dataset", () => {
    const c = countBy(places, (p) => p.tags);
    expect(c.get("Matcha")).toBe(15);
    expect(countBy(places, (p) => [p.area]).get("Shijo")).toBe(18);
  });
});

describe("url state", () => {
  it("round-trips", () => {
    const f = emptyFilters();
    f.type.add("Tea & sweets");
    f.tags.add("Vegan / plant-based");
    f.price.add(2);
    f.opensLate = true;
    const out = fromSearch(toSearch(f, "kyoto station"));
    expect(out.query).toBe("kyoto station");
    expect([...out.filters.type]).toEqual(["Tea & sweets"]);
    expect([...out.filters.tags]).toEqual(["Vegan / plant-based"]);
    expect([...out.filters.price]).toEqual([2]);
    expect(out.filters.opensLate).toBe(true);
    expect(out.filters.opensByNineAm).toBe(false);
  });
  it("ignores bad price values", () => {
    expect(fromSearch("price=9&price=x").filters.price.size).toBe(0);
  });
});

describe("shortlist storage", () => {
  const fake = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage;
  };
  it("persists and reloads", () => {
    const s = fake();
    saveShortlist(new Set([1, 2]), s);
    expect([...loadShortlist(s)]).toEqual([1, 2]);
  });
  it("works with storage disabled or throwing", () => {
    const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } } as unknown as Storage;
    expect(() => saveShortlist(new Set([1]), broken)).not.toThrow();
    expect(loadShortlist(broken).size).toBe(0);
    expect(loadShortlist(null).size).toBe(0);
  });
  it("ignores corrupt data", () => {
    const s = fake();
    s.setItem("kyotoguide.shortlist.v1", "{not json");
    expect(loadShortlist(s).size).toBe(0);
  });
});

describe("links", () => {
  it("builds the Google Maps link per spec", () => {
    expect(mapsUrl({ name: "Café & Co", googlePlaceId: "ChIJabc" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20%26%20Co%20Kyoto&query_place_id=ChIJabc",
    );
  });
});

describe("user-added places (no book section)", () => {
  it("never match a Book section filter but still match other filters", () => {
    const user = { ...places[0], id: 80, source: "user" as const, bookSection: null, bookPage: null, googlePlaceId: "" };
    const withUser = [...places, user];
    expect(withUser.filter((p) => p.bookSection === null)).toHaveLength(1);
    expect(mapsUrlNoId()).not.toMatch(/query_place_id/);
  });
});
function mapsUrlNoId() {
  return mapsUrl({ name: "My spot", googlePlaceId: "" });
}
