export type BookSection =
  | "Coffee & kissaten"
  | "Tea & sweets"
  | "Eating & drinking"
  | "For early risers"
  | "Temples & gardens"
  | "Mindful experiences";

export interface Place {
  id: number;
  /** null for places you add yourself. */
  bookPage: number | null;
  bookSection: BookSection | null;
  name: string;
  nameJp: string | null;
  area: string;
  type: string;
  priceTier: 0 | 1 | 2 | 3;
  lat: number;
  lng: number;
  /** May be empty for places you add yourself. */
  googlePlaceId: string;
  /** 'book' = from the guidebook, 'user' = added through the app. */
  source?: "book" | "user";
  address: string;
  station: string;
  hoursBook: string;
  closedDaysBook: string | null;
  opensByNineAm: boolean;
  opensLate: boolean;
  phone: string | null;
  website: string | null;
  tags: string[];
  summary: string;
  bookPicks: string;
  hoursGoogle: string;
  hoursConflict: 0 | 1 | 2;
  dataNote: string | null;
  bookTagline: string | null;
  bookText: string | null;
}

export interface Taxonomy {
  types: { name: string; colorLight: string; colorDark: string; count: number }[];
  bookSections: { name: string; idRange: [number, number]; sourcePdf: string }[];
  areas: { name: string; count: number }[];
  tags: { name: string; count: number }[];
  priceTiers: { value: number; label: string }[];
}

export interface Filters {
  area: Set<string>;
  bookSection: Set<string>;
  type: Set<string>;
  price: Set<number>;
  tags: Set<string>;
  opensLate: boolean;
  opensByNineAm: boolean;
  shortlist: boolean;
}
