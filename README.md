# Kyoto places map

A filter-only map of 79 places in Kyoto from a travel guidebook. No AI at runtime: everything is client-side search and filtering over `src/data/places.json`.

Stack: Vite + React + TypeScript, MapLibre GL JS with OpenStreetMap raster tiles, Vitest.

```
npm install
npm run dev        # dev server
npm test           # unit tests: match(), normaliser, validator, URL state, shortlist
npm run build      # typecheck + production build
```

## Layout
- `src/lib/` – pure logic: `match.ts` (OR within group, AND across groups, AND for tags, AND for search tokens), `normalize.ts`, `validate.ts` (schema/taxonomy/bounds/id checks), `urlState.ts`, `shortlist.ts`, `links.ts`
- `src/components/` – `FilterPanel`/`ChipGroup`, `PlaceList`/`PlaceCard`, `MapView`
- `src/data/` – `places.json`, `taxonomy.json` (controlled vocabularies and type colours)
- `docs/SPEC.md` – full spec (behaviour, extraction prompts, known data issues, how to add pages)
- `docs/prototype/` – original single-file prototype (behaviour reference only)
- `pipeline/` – OCR scripts, kept for future expansion; not used by the app

## Before publishing
- **Data licence:** `lat`, `lng` and `hoursGoogle` came from Google Places, whose terms restrict storing/displaying that data outside Google Maps. Check them, or re-geocode with Nominatim/Overpass (SPEC §5). `googlePlaceId` is only used for the "Open in Google Maps" link; `hoursGoogle`/`hoursConflict` are optional.
- **Map tiles:** `tile.openstreetmap.org` is fine for development but its usage policy forbids heavy use. Switch the tile source in `src/components/MapView.tsx` to a hosted provider or self-hosted PMTiles for production.
- Known data problems (Eikan-do price guess, book address/phone errors, OCR typos) are listed in `docs/SPEC.md` §7.
