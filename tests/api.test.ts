import { describe, expect, it } from "vitest";
import { addPlace, fetchPlaces, rowToPlace, toColumns, updatePlace, type PlaceRow } from "../src/lib/api";
import { places } from "./helpers";

const row = (over: Partial<PlaceRow> = {}): PlaceRow => ({
  id: 1, source: "book", book_page: 33, book_section: "Coffee & kissaten", name: "Walden Woods Kyoto", name_jp: null,
  area: "Kyoto Station", type: "Specialty coffee", price_tier: 1, lat: 34.99, lng: 135.76, google_place_id: "abc",
  address: "a", station: "s", hours_book: "h", closed_days_book: null, opens_by_nine_am: true, opens_late: false,
  phone: null, website: null, tags: ["Matcha"], summary: "x", book_picks: "y", hours_google: "g", hours_conflict: 1, data_note: null,
  ...over,
});

/** Minimal stand-in for the supabase-js query builder. */
function fakeClient(result: { data?: unknown; error?: unknown }, calls: unknown[][] = []) {
  const chain: any = {
    select: (...a: unknown[]) => { calls.push(["select", ...a]); return chain; },
    order: (...a: unknown[]) => { calls.push(["order", ...a]); return Promise.resolve(result); },
    insert: (...a: unknown[]) => { calls.push(["insert", ...a]); return chain; },
    update: (...a: unknown[]) => { calls.push(["update", ...a]); return chain; },
    eq: (...a: unknown[]) => { calls.push(["eq", ...a]); return chain; },
    single: () => Promise.resolve(result),
  };
  return { from: (t: string) => { calls.push(["from", t]); return chain; } } as any;
}

describe("rowToPlace", () => {
  it("maps columns and merges the author's text from the bundle for book rows", () => {
    const byId = new Map(places.map((p) => [p.id, p]));
    const p = rowToPlace(row(), byId);
    expect(p).toMatchObject({ id: 1, bookPage: 33, priceTier: 1, googlePlaceId: "abc", opensByNineAm: true });
    expect(p.bookText).toBe(places[0].bookText);
    expect(p.bookTagline).toBe(places[0].bookTagline);
  });
  it("leaves book text empty for user rows and tolerates nulls", () => {
    const p = rowToPlace(row({ id: 80, source: "user", book_page: null, book_section: null, google_place_id: null }), new Map(places.map((x) => [x.id, x])));
    expect(p.bookText).toBeNull();
    expect(p.bookSection).toBeNull();
    expect(p.googlePlaceId).toBe("");
  });
});

describe("toColumns", () => {
  it("maps camelCase to snake_case and drops unknown/undefined keys", () => {
    expect(toColumns({ name: "A", nameJp: "あ", opensLate: true, priceTier: 2, bogus: 1, summary: undefined } as any)).toEqual({
      name: "A", name_jp: "あ", opens_late: true, price_tier: 2,
    });
  });
  it("cannot set id or source", () => {
    expect(toColumns({ id: 5, source: "book" } as any)).toEqual({});
  });
});

describe("fetchPlaces / addPlace / updatePlace", () => {
  it("returns null when no database is configured", async () => {
    expect(await fetchPlaces(null)).toBeNull();
  });
  it("loads and orders places", async () => {
    const calls: unknown[][] = [];
    const out = await fetchPlaces(fakeClient({ data: [row(), row({ id: 2, name: "B" })] }, calls));
    expect(out?.map((p) => p.id)).toEqual([1, 2]);
    expect(calls).toContainEqual(["from", "kyoto_places"]);
    expect(calls).toContainEqual(["order", "id"]);
  });
  it("throws on a request error so the app can fall back", async () => {
    await expect(fetchPlaces(fakeClient({ error: new Error("boom") }))).rejects.toThrow("boom");
  });
  it("inserts only mapped columns and returns the new place", async () => {
    const calls: unknown[][] = [];
    const p = await addPlace({ name: "Mine", area: "Gion", type: "Kissaten", lat: 35, lng: 135.77, hoursBook: "9–5" }, fakeClient({ data: row({ id: 80, source: "user", name: "Mine" }) }, calls));
    expect(p.id).toBe(80);
    expect(calls).toContainEqual(["insert", { name: "Mine", area: "Gion", type: "Kissaten", lat: 35, lng: 135.77, hours_book: "9–5" }]);
  });
  it("updates by id", async () => {
    const calls: unknown[][] = [];
    await updatePlace(3, { summary: "new" }, fakeClient({ data: row({ id: 3, summary: "new" }) }, calls));
    expect(calls).toContainEqual(["update", { summary: "new" }]);
    expect(calls).toContainEqual(["eq", "id", 3]);
  });
});
