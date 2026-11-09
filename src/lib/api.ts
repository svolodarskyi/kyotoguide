import type { SupabaseClient } from "@supabase/supabase-js";
import type { Place } from "../types";
import { places as bundled } from "../data";
import { supabase } from "./supabase";

const TABLE = "kyoto_places";

/** A row of public.kyoto_places (snake_case). */
export interface PlaceRow {
  id: number;
  source: "book" | "user";
  book_page: number | null;
  book_section: string | null;
  name: string;
  name_jp: string | null;
  area: string;
  type: string;
  price_tier: number;
  lat: number;
  lng: number;
  google_place_id: string | null;
  address: string;
  station: string;
  hours_book: string;
  closed_days_book: string | null;
  opens_by_nine_am: boolean;
  opens_late: boolean;
  phone: string | null;
  website: string | null;
  tags: string[];
  summary: string;
  book_picks: string;
  hours_google: string;
  hours_conflict: number;
  data_note: string | null;
}

/** Fields you provide when adding a place; everything else has a default in the database. */
export type PlaceInput = Pick<Place, "name" | "area" | "type" | "lat" | "lng"> &
  Partial<
    Pick<
      Place,
      | "nameJp" | "priceTier" | "googlePlaceId" | "address" | "station" | "hoursBook" | "closedDaysBook"
      | "opensByNineAm" | "opensLate" | "phone" | "website" | "tags" | "summary" | "bookPicks"
      | "hoursGoogle" | "hoursConflict" | "dataNote"
    >
  >;

/** The author's text is not stored in the database; it is merged from the bundled data by id. */
export function rowToPlace(r: PlaceRow, bundledById: ReadonlyMap<number, Place> = new Map()): Place {
  const text = r.source === "book" ? bundledById.get(r.id) : undefined;
  return {
    id: r.id,
    source: r.source,
    bookPage: r.book_page,
    bookSection: r.book_section as Place["bookSection"],
    name: r.name,
    nameJp: r.name_jp,
    area: r.area,
    type: r.type,
    priceTier: r.price_tier as Place["priceTier"],
    lat: r.lat,
    lng: r.lng,
    googlePlaceId: r.google_place_id ?? "",
    address: r.address,
    station: r.station,
    hoursBook: r.hours_book,
    closedDaysBook: r.closed_days_book,
    opensByNineAm: r.opens_by_nine_am,
    opensLate: r.opens_late,
    phone: r.phone,
    website: r.website,
    tags: r.tags ?? [],
    summary: r.summary,
    bookPicks: r.book_picks,
    hoursGoogle: r.hours_google,
    hoursConflict: r.hours_conflict as Place["hoursConflict"],
    dataNote: r.data_note,
    bookTagline: text?.bookTagline ?? null,
    bookText: text?.bookText ?? null,
  };
}

/** camelCase patch -> snake_case columns (only the keys present). */
export function toColumns(p: Partial<PlaceInput>): Record<string, unknown> {
  const map: Record<string, string> = {
    name: "name", nameJp: "name_jp", area: "area", type: "type", priceTier: "price_tier", lat: "lat", lng: "lng",
    googlePlaceId: "google_place_id", address: "address", station: "station", hoursBook: "hours_book",
    closedDaysBook: "closed_days_book", opensByNineAm: "opens_by_nine_am", opensLate: "opens_late",
    phone: "phone", website: "website", tags: "tags", summary: "summary", bookPicks: "book_picks",
    hoursGoogle: "hours_google", hoursConflict: "hours_conflict", dataNote: "data_note",
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) if (k in map && v !== undefined) out[map[k]] = v;
  return out;
}

const bundledById = new Map(bundled.map((p) => [p.id, p]));

/** All places from the database, or null when no database is configured. Throws on a request error. */
export async function fetchPlaces(client: SupabaseClient | null = supabase): Promise<Place[] | null> {
  if (!client) return null;
  const { data, error } = await client.from(TABLE).select("*").order("id");
  if (error) throw error;
  return (data as PlaceRow[]).map((r) => rowToPlace(r, bundledById));
}

/** Add a place. It is always stored as source = 'user'; the database assigns the id. */
export async function addPlace(input: PlaceInput, client: SupabaseClient | null = supabase): Promise<Place> {
  if (!client) throw new Error("No database configured");
  const { data, error } = await client.from(TABLE).insert(toColumns(input)).select().single();
  if (error) throw error;
  return rowToPlace(data as PlaceRow);
}

/** Edit a place. There is deliberately no delete: removing is done in the Supabase dashboard. */
export async function updatePlace(id: number, patch: Partial<PlaceInput>, client: SupabaseClient | null = supabase): Promise<Place> {
  if (!client) throw new Error("No database configured");
  const { data, error } = await client.from(TABLE).update(toColumns(patch)).eq("id", id).select().single();
  if (error) throw error;
  return rowToPlace(data as PlaceRow, bundledById);
}
