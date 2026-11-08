# Kyoto Places Map: App Spec

A filter-only map of 79 places in Kyoto from a travel guidebook (cafés, tea and sweets, food, temples, gardens). No AI search at runtime: all search and filtering runs on structured data extracted once from the book. Target stack: React + open-source map. This spec and `data/` are meant to be handed to Claude Code.

## 0. Contents of this folder

| Path | What |
|---|---|
| `SPEC.md` | This document |
| `data/places.json` | All 79 places, full records including the author's original text |
| `data/taxonomy.json` | Types (with colors), book sections, areas, tags, price tiers, flags, with counts |
| `pipeline/01_ocr_pages.sh`, `pipeline/02_blocks.py` | OCR scripts used on the scanned PDFs |
| `prototype/prototype.html` | The working single-file prototype (reference for behavior and layout, not for architecture) |

## 1. Source material

Six scanned guidebook sections (images only, no text layer), 79 pages, one place per page:

| Book section (`bookSection`) | PDF | Ids | Pages |
|---|---|---|---|
| Coffee & kissaten | cafe_kissaten.pdf | 1–12 | 33–45 |
| Tea & sweets | tea_sweets.pdf | 13–25 | 85–99 |
| Eating & drinking | eating_drinking.pdf | 26–49 | 50–79 |
| For early risers | for_early_risers.pdf | 50–59 | 153–169 |
| Temples & gardens | gardens_temples.pdf | 60–68 | 168–178 |
| Mindful experiences | mindful_experiences.pdf + mimdful_experiences_1.pdf | 69–79 | 181–197 |

Ids follow the order of the PDFs (not book page order). `bookSection` is derived from the file name and is separate from `type`, which is the app's own classification. Keep both.

Each book page has a fixed layout: area label, name (English + Japanese), an italic one-line tagline, a short info column (address, phone, nearest station, opening hours, price in ¥ icons, website) and one or two paragraphs of author description. On some pages the info column interleaves with the description in the OCR.

## 2. Data model

`data/places.json` is an array of `Place`:

```ts
interface Place {
  id: number;                 // 1–79, stable
  bookPage: number;           // printed page number
  bookSection: "Coffee & kissaten" | "Tea & sweets" | "Eating & drinking"
             | "For early risers" | "Temples & gardens" | "Mindful experiences";
  name: string;               // English name as printed
  nameJp: string | null;
  area: string;               // book's area label (see taxonomy.areas)
  type: string;               // app type (see taxonomy.types)
  priceTier: 0 | 1 | 2 | 3;   // 0 = free; 1–3 = ¥ icons printed in the book (entry fee for sights)
  lat: number; lng: number;   // WGS84, from Google Places (see section 5)
  googlePlaceId: string;      // use for "Open in Google Maps"
  address: string;            // as printed (or Google's when the book was wrong; see dataNote)
  station: string;
  hoursBook: string;          // as printed, normalised (en dash, 24h-free)
  closedDaysBook: string | null; // derived from the printed days, e.g. "Wed" or "Mon, Tue"
  opensByNineAm: boolean;     // opens at 9:00 or earlier (book hours)
  opensLate: boolean;         // book closing time at or after 22:00 (24h places count)
  phone: string | null;       // domestic format with area code 075 added
  website: string | null;     // host + path, no scheme
  tags: string[];             // see taxonomy.tags
  summary: string;            // short paraphrase written during extraction (not the author's words)
  bookPicks: string;          // dishes/things the authors tried or recommend
  hoursGoogle: string;        // what Google listed at build time (free text)
  hoursConflict: 0 | 1 | 2;   // book vs Google: 0 agree / no data, 1 slightly different, 2 different days or hours
  dataNote: string | null;    // known data problem to show on the card
  bookTagline: string | null; // author's italic tagline, OCR text
  bookText: string | null;    // author's description, OCR text, one paragraph
}
```

Counts: 79 places, 15 open by 9am, 14 open late, hours conflicts: 32 none, 30 slight, 17 conflict.

`data/taxonomy.json` holds the controlled vocabularies and the per-type colors (light and dark). Do not generate new tags at runtime.

## 3. App requirements

### 3.1 Layout
- Desktop (≥900px): two columns. Left: header, search, filter panel, result list. Right: sticky full-height map.
- Mobile: map on top (sticky, about 45% of the viewport), filters in a collapsible panel, list below. Tapping a map pin scrolls the list to that card and expands it. Tapping a card pans the map.
- Light and dark themes via CSS variables, following `prefers-color-scheme`, with a manual override. Respect 16px side gutters and safe-area insets.

### 3.2 Map (open source)
- Library: Leaflet (`react-leaflet`) or MapLibre GL JS (`react-map-gl/maplibre`). Either works; MapLibre gives smoother zoom and vector tiles.
- Tiles: OpenStreetMap raster tiles are fine for development; for production use a provider that allows it (Protomaps PMTiles self-hosted, MapTiler, Stadia) because the OSM tile server's usage policy forbids heavy use. Always show attribution (© OpenStreetMap contributors).
- Markers: pin or numbered circle colored by `type`, number = `id`. Selected marker is larger with a halo. 79 points, so clustering is optional; if added, disable it above zoom 15.
- Behavior: fit bounds to the currently filtered places on every filter change; "Fit all" button; pan/zoom to a place on select; keep the map instance mounted (do not recreate it on filter change). Show a small peek card for the selected place on mobile.
- Coverage: lat 34.951–35.064, lng 135.671–135.819 (Daigo-ji at the SE edge, Arashiyama at the W edge, Ruriko-in at the N edge).
- The prototype drew its own SVG map because its sandbox blocked tile requests. Do not reproduce that.

### 3.3 Filters (pure client-side, no AI)
Groups, in panel order:

| Group | Field | Notes |
|---|---|---|
| Area | `area` | OR within group |
| Book section | `bookSection` | OR within group |
| Type | `type` | OR within group; chip shows the type color dot |
| Price | `priceTier` | OR; labels Free, ¥, ¥¥, ¥¥¥ |
| Features | `tags` | **AND** within group (a place must have all selected tags) |
| Hours and list | `opensLate`, `opensByNineAm`, shortlist | each is a boolean toggle; AND with everything |

Semantics: OR within a group, AND across groups. Each chip shows the count of places that match it across the whole dataset, not the filtered set. Show "N of 79 places" and a Clear button. Zero results shows an empty state with a Clear action.

Text search: one box, tokenised on whitespace, every token must appear (AND). Normalise to lower case and strip diacritics (`é`→`e`, macrons) in both query and index. Index fields: name, nameJp, area, type, bookSection, station, address, summary, bookPicks, tags, bookTagline, bookText, hoursBook, closedDaysBook, and "¥"-count (or "free"). This is plain substring matching, not fuzzy and not semantic.

No date picker and no "open now" logic (explicitly out of scope). Hours are displayed as text only.

### 3.4 Place card
Collapsed: number badge (type color), name, nameJp, line `type · area · station · price`, hours line, "Closed X" if present, tags, and shortlist star. Expanded:
1. `summary`
2. A warning box when `hoursConflict === 2`: "Google Maps lists different days or hours than the book. Check before you go." Show a small badge on the collapsed card too.
3. A warning box with `dataNote` when present.
4. Definition list: Book picks, Address, Phone, Google hours, Book section and page.
5. Buttons: Open in Google Maps, Website (only when `website` is set).
6. A "See original text" disclosure, **collapsed by default**, showing `bookTagline` (bold/italic) and `bookText`, labelled "The book, p. N". Note beneath: text is OCR and may contain typos.

Google Maps link: `https://www.google.com/maps/search/?api=1&query=<urlencoded "name Kyoto">&query_place_id=<googlePlaceId>`.

### 3.5 Shortlist
Star toggle per card, persisted in `localStorage` (wrap every access in try/catch; the app must work without storage). "★ Shortlist" filter shows only starred places. "Copy shortlist" copies a plain list (name, address, hours, Maps link) with a clipboard fallback.

### 3.6 Nice to have
- Filter state in the URL query string so views can be shared.
- Keyboard: arrow keys move between cards; Escape collapses.
- Print-friendly shortlist page (note: the prototype avoided `window.print` because of sandbox limits; a real app can use it).

## 4. How the data was extracted (repeatable)

### 4.1 Steps
1. **Render and OCR.** `pipeline/01_ocr_pages.sh section.pdf out/` renders pages at 200 dpi grayscale and runs Tesseract (`--psm 3`) for plain text and TSV. Structured fields (name, address, hours, price, phone, website, Japanese name) for ids 1–49 were read directly from the page images by the model; for ids 50–79 they came from the OCR and were checked against the images where the OCR was garbled. The author's original text (`bookTagline`, `bookText`) for all 79 places was added afterwards from OCR (steps 1–2) with manual repair.
2. **Group the text.** `pipeline/02_blocks.py out/ > blocks.json` groups OCR words into paragraphs. Chunks under 30 words are the info column and tagline; longer chunks are the description.
3. **Review pass (LLM, per page).** Two-column pages interleave info and description, and the OCR garbles icons, digits and Japanese. Every page needs a review using the prompt in 4.2. Roughly a third of the 79 pages needed hand repair of the OCR text (interleaved columns, truncated last lines). Reading the page image fixed ambiguous hours (e.g. "Tues–Sun" and "Fri–Wed" were confirmed by cropping the info column).
4. **Normalise** (rules in 4.3).
5. **Classify** type, tags and flags (prompt 4.4).
6. **Geocode** (section 5).
7. **Cross-check** book hours against Google hours and set `hoursConflict`.
8. **Assemble** into `places.json`; validate against the schema and taxonomy (every tag, area and type must exist in `taxonomy.json`; ids 1–N contiguous).

### 4.2 Prompt: per-page extraction

Use with a vision-capable model, passing the page image and the OCR text as a hint. Ask for JSON only.

```
You are extracting one place from one scanned page of a Kyoto travel guidebook.
Inputs: (1) the page image, (2) noisy OCR text of the same page. Trust the image over the OCR.

Return one JSON object with exactly these keys:
{
  "bookPage": number,                 // printed page number at the bottom, e.g. "-86-" -> 86
  "areaLabel": string,                // small label above the name, e.g. "Kyoto Station", "Shijo"
  "name": string,                     // English name exactly as printed
  "nameJp": string|null,              // Japanese name if legible, else null (never guess)
  "tagline": string,                  // the italic one-line subtitle, verbatim
  "address": string|null,             // as printed (pin icon)
  "phone": string|null,               // as printed (phone icon); do not add an area code
  "station": string|null,             // transport icon line (station or bus stop)
  "hours": string|null,               // clock icon line, verbatim; keep "&", "(variable opening)" etc.
  "priceIcons": 0|1|2|3,              // number of filled ¥ symbols; 0 if none shown
  "website": string|null,             // web icon line, no scheme
  "description": string,              // the author's body text, verbatim, one paragraph per printed paragraph
  "uncertain": [string]               // list every field where the image was unclear or the OCR disagreed
}

Rules:
- Verbatim. Do not paraphrase, summarise, correct spelling or add information in tagline/description.
- If the info column and the description are interleaved in the OCR, separate them using the image layout.
- If a value is not visible, use null and add the field name to "uncertain". Never invent phone numbers, hours or prices.
- Keep printed cross references such as "(see p. 63)".
```

### 4.3 Normalisation rules used
- `hoursBook`: en dash for ranges ("Mon–Sun 9am–5pm"); times 12-hour with am/pm as printed. `closedDaysBook`: the days not covered by the printed range (e.g. "Thu–Mon" printed → closed "Tue, Wed").
- `phone`: printed numbers lack the area code; prefix `075-` and format `075-xxx-xxxx`. Mobile numbers printed without the leading 0 (e.g. "80 7603 6106") become `080-7603-6106`.
- `priceTier`: number of ¥ icons. For sights it is the entry fee level. `0` when the entry is free and no ¥ is printed.
- `opensByNineAm`: first opening time ≤ 9:00. `opensLate`: closing time ≥ 22:00 on any day, or open 24 hours.
- `area`: the book's own label, except "Gojo", "Teramachi", "Gion", "Nishijin", "Demachiyanagi" are kept as separate areas rather than merged.
- `website`: strip `http(s)://` and `www.`. Fix obvious OCR errors in domains by checking the page image.
- OCR fixes in `bookText`: ligature/diacritic repair (`François`), dropped spaces, stray icon glyphs, "Ona" → "On a". Nothing was reworded. Known remaining OCR typos are possible (see section 7).

### 4.4 Prompt: type, tags, flags and summary

Run after extraction, one place at a time, with the extracted JSON and `taxonomy.json` in context.

```
You classify one Kyoto place for a filter-only map. Use ONLY the vocabularies provided.

Input: the extracted page JSON (description, tagline, hours, etc.) and the allowed lists
  types[], tags[], areas[].

Return JSON:
{
  "type": one of types[],
  "tags": [subset of tags[]],
  "summary": string,        // 1–2 sentences, plain, neutral, max 40 words, your own words
  "bookPicks": string,      // dishes/things the authors say they tried or recommend, comma separated, from the text only
  "opensByNineAm": boolean, // from hours
  "opensLate": boolean      // from hours
}

Rules:
- A tag applies only if the description or hours explicitly support it (e.g. "Matcha" only if matcha is mentioned
  as something served or sold; "Reservations" only if booking or reservations are stated as needed or advised).
- Do not infer tags from the place name or from general knowledge.
- Prefer fewer, accurate tags over many. Tags are used with AND logic, so a wrong tag hides the place.
- type: choose by what the place primarily is. Kissaten = retro coffee house; Specialty coffee = modern roaster/pour-over;
  Garden café = café whose main draw is a garden; Café + shop = café with a significant shop/gallery;
  Tea & sweets = tea rooms, wagashi, desserts; Eating & drinking = meals, izakaya, markets; 
  Temples & shrines = temples and shrines; Gardens & culture = gardens, nature walks, museums, workshops.
- The summary must not copy sentences from the book.
```

Controlled vocabularies are in `data/taxonomy.json`.

## 5. Geocoding (repeatable)

The prototype used Google Places text search (a connected tool). The procedure:

1. Query: `"<name> Kyoto"`. For chains or ambiguous names add the area or station (`"Good Time Coffee Kyoto Umekoji"`). Take the top result only (`max_results=1`).
2. Record from the result: `latitude`, `longitude`, `place_id`, `address`, weekday hours (as `hoursGoogle`), phone (only as a fallback when the book has none or it is a duplicate).
3. **Validate every result:**
   - Name must plausibly match (Google often romanises differently: "Kokora Ya", "Hitsuji Doughnuts", "Toraya Kyoto Ichijo").
   - Coordinates must lie within lat 34.90–35.10 and lng 135.65–135.85.
   - The street/ward must roughly match the printed address. Mismatches were the signal for book errors (see section 7).
   - Chains and sub-temples: confirm the result is the right branch (e.g. Kaikado: the shop, not the café).
4. Compare Google hours with `hoursBook`: identical → `0`, similar (opening/closing differ by under about 30 minutes or one weekday) → `1`, different closed days or clearly different hours → `2`. Places with no Google hours → `0`.
5. Do not geocode from the romanised address alone; Kyoto's address system is ward + block names and Nominatim handles romanised Japanese poorly.

**For the open-source map:** the tiles and map library are open, but `lat`, `lng` and `hoursGoogle` here came from Google. Google's terms restrict storing and displaying Google data outside Google maps and limit caching of coordinates; `place_id` is the allowed exception. Check the terms before publishing the app. If you need an all-open-data version, re-geocode the 79 places with Nominatim or Overpass (query by English name + Kyoto bounding box, 1 request per second, send a User-Agent), then snap the remaining misses by hand on an OSM map. Keep `googlePlaceId` only for the Maps deep link. Treat `hoursGoogle` and `hoursConflict` as optional fields that can be dropped.

## 6. Suggested architecture

- Vite + React + TypeScript. Data is a static `places.json` imported at build time (79 records, about 170 KB; the original text is most of that and could be lazy-loaded from `places-text.json` keyed by id).
- State: a small store (Zustand or `useReducer`) holding `{ query, filters, selectedId, shortlist }`. Derived `visible = places.filter(match)` is memoised; counts per chip are precomputed once.
- Components: `App`, `Header`, `SearchBox`, `FilterPanel` (+ `ChipGroup`), `PlaceList`, `PlaceCard`, `MapView`, `OriginalText`, `ShortlistBar`.
- Index: build the lowercase/diacritic-stripped search string per place once at load.
- Testing: unit-test `match()` (OR within group, AND for tags, AND across groups), the text normaliser, and a data validator (schema + taxonomy membership + coordinate bounds). One Playwright test: apply Type = Temples & shrines and Features = Autumn colours, expect the list and map markers to agree.

Filter logic reference:

```ts
function match(p: Place, f: Filters, tokens: string[], index: string): boolean {
  if (f.area.size && !f.area.has(p.area)) return false;
  if (f.bookSection.size && !f.bookSection.has(p.bookSection)) return false;
  if (f.type.size && !f.type.has(p.type)) return false;
  if (f.price.size && !f.price.has(p.priceTier)) return false;
  for (const t of f.tags) if (!p.tags.includes(t)) return false;
  if (f.opensLate && !p.opensLate) return false;
  if (f.opensByNineAm && !p.opensByNineAm) return false;
  if (f.shortlist && !shortlist.has(p.id)) return false;
  return tokens.every(t => index.includes(t));
}
```

## 7. Known data issues (carry these into the app)

- **Book errors found:** Shichijo Kanshundo (id 22): printed address and phone duplicate Umezono Sabo's; Google's are used. Nishiki Market (id 37): printed phone duplicates master-piece coffee's; left out. Rakushisha (id 79): printed ward looks wrong; Google's is used.
- **Guesses:** Eikan-do (id 62) entry price was unreadable; `priceTier` 2 is a guess. Verify.
- **Hours:** 17 places conflict with Google and 30 differ slightly. The book's hours are the reference; Google's can be seasonal (temple autumn hours, evening openings). Some Google listings are for a sibling shop or have no hours (Weekenders, Coffee House Maki, Saiho-ji).
- **No phone:** Flower Green Days, Nishiki Market. **No website:** Hitsuji, Kazariya, Okudohan, Okutan Nanzen-ji, Sagano Bamboo Grove, Botanical Gardens.
- **Original text is OCR**, one paragraph per place with page-column line breaks removed. Possible residual typos (for example "Marcourt" in master-piece coffee's text was not verified against the image). A proof-read pass with the page images would remove these.
- **Japanese names** for ids 1–49 were transcribed from the page images; those for ids 50–79 were supplied from general knowledge and not verified against the scans (blank where unsure).
- `summary`, `tags`, `bookPicks` and `hoursConflict` are model-generated and have not been independently verified. `bookTagline` and `bookText` are the author's words.
- Sections overlap in the book (for example Shosei-en appears on a Higashi Hongan-ji page and has its own page). Each place appears once, under the section of its own page.

## 8. Adding more pages later

1. Add the PDF; run steps 4.1.1–4.1.2.
2. Run prompt 4.2 per page; review `uncertain`.
3. Run prompt 4.4; add any genuinely new tag or type to `taxonomy.json` first (and a color).
4. Geocode and cross-check (section 5).
5. Append records with the next ids (80+), add the PDF to `bookSections` with its id range, run the data validator.

## 9. Acceptance criteria

1. All 79 places render as list cards and map markers; counts on chips match the dataset.
2. Each filter group follows the semantics in 3.3; combining filters never produces results outside every selected group.
3. Search works without accents ("Francois" finds "François"), finds text inside the original book text, and combines with filters.
4. Selecting a marker or card keeps both in sync; the map fits to filtered results.
5. The original text is hidden until "See original text" is activated.
6. Shortlist persists across reloads and the app still works with storage disabled.
7. Works at 360px width and in dark mode; no horizontal scroll; chips and buttons are keyboard operable.
8. Map tiles come from an OSS-compatible source with visible attribution.
9. `places.json` passes the validator (tags, areas, types in taxonomy; coordinates within bounds; ids contiguous 1–79).
