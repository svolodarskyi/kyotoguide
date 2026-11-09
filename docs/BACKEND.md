# Backend (Supabase)

Project: `consignment-v1` (`ufnofpnshvniyvpudylt`), shared with another app. Everything here is in `public` and prefixed `kyoto_`.

## Tables
- `kyoto_places`: one row per place (79 from the book with ids 1–79 and `source = 'book'`; new ones get ids 80+ and `source = 'user'`). The book's original text is **not** stored here. The app merges it from the bundled `places.json` by id.
- `kyoto_place_history`: every update stores the previous row (`old_row` jsonb). Not readable through the API. Use it to undo a bad edit.

## What anonymous visitors (the publishable key) can do
| | |
|---|---|
| Read all places | yes |
| Add a place | yes, always saved as `source = 'user'`, id assigned by the database |
| Edit any place | yes (`id`, `source`, `created_at` can't be changed) |
| Delete / truncate | **no** (no policy, no grant) |
| Read edit history | no |

Because editing is open, anyone with the site can change any place, including the book's. Restore from `kyoto_place_history` in the Supabase SQL editor if needed. There is no rate limiting. If abuse appears, the options are a login or a "pending until approved" column; tell me and I'll add it.

## In the app
- `src/lib/supabase.ts` creates the client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`; set in Vercel for production).
- `src/lib/api.ts`: `fetchPlaces()`, `addPlace()`, `updatePlace()`. There is no delete function on purpose.
- The app shows the bundled data immediately and swaps to the database data once loaded. If the request fails or the env vars are missing it keeps the bundled data.
- There is no "add place" screen yet. Until there is, add rows in the Supabase table editor (leave `id`, `source` and timestamps alone) or call `addPlace()`.

## Adding a place by SQL
```sql
insert into public.kyoto_places (name, area, type, lat, lng, address, station, hours_book, price_tier, tags, summary)
values ('My place', 'Gion', 'Kissaten', 35.0036, 135.7755, '1 Example-cho', 'Gion-Shijo', 'Daily 9am–5pm', 1, array['Retro interior'], 'Short description.');
```
`area`, `type` and `tags` should use values from `src/data/taxonomy.json`; other values save fine but have no filter chip or colour.
