-- Applied to Supabase project ufnofpnshvniyvpudylt ("consignment-v1") as migration `kyoto_places_schema`.
-- Everything is prefixed kyoto_ so it never collides with the other app's tables in that project.

create table public.kyoto_places (
  id bigint generated always as identity primary key,
  source text not null default 'user' check (source in ('book','user')),
  book_page integer,
  book_section text check (char_length(book_section) <= 100),
  name text not null check (char_length(name) between 1 and 200),
  name_jp text check (char_length(name_jp) <= 200),
  area text not null check (char_length(area) between 1 and 100),
  type text not null check (char_length(type) between 1 and 100),
  price_tier smallint not null default 0 check (price_tier between 0 and 3),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  google_place_id text check (char_length(google_place_id) <= 300),
  address text not null default '' check (char_length(address) <= 500),
  station text not null default '' check (char_length(station) <= 200),
  hours_book text not null default '' check (char_length(hours_book) <= 500),
  closed_days_book text check (char_length(closed_days_book) <= 200),
  opens_by_nine_am boolean not null default false,
  opens_late boolean not null default false,
  phone text check (char_length(phone) <= 50),
  website text check (char_length(website) <= 300),
  tags text[] not null default '{}' check (cardinality(tags) <= 30),
  summary text not null default '' check (char_length(summary) <= 2000),
  book_picks text not null default '' check (char_length(book_picks) <= 1000),
  hours_google text not null default '' check (char_length(hours_google) <= 500),
  hours_conflict smallint not null default 0 check (hours_conflict between 0 and 2),
  data_note text check (char_length(data_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kyoto_places is 'Kyoto guide places. Anonymous read/insert/update; no deletes. Book text is kept in the app bundle, not here.';

-- Undo log: every update stores the previous row. Not accessible to API roles.
create table public.kyoto_place_history (
  id bigint generated always as identity primary key,
  place_id bigint not null,
  old_row jsonb not null,
  changed_at timestamptz not null default now()
);
create index kyoto_place_history_place_idx on public.kyoto_place_history (place_id, changed_at desc);

create function public.kyoto_places_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.kyoto_place_history (place_id, old_row) values (old.id, to_jsonb(old));
    new.id := old.id;
    new.source := old.source;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke execute on function public.kyoto_places_guard() from public, anon, authenticated;

create trigger kyoto_places_guard
  before insert or update on public.kyoto_places
  for each row execute function public.kyoto_places_guard();

alter table public.kyoto_places enable row level security;
alter table public.kyoto_place_history enable row level security;

-- API roles: read, add, edit. No delete, no truncate, no history access.
revoke all on table public.kyoto_places from anon, authenticated;
revoke all on table public.kyoto_place_history from anon, authenticated;
grant select, insert, update on table public.kyoto_places to anon, authenticated;

create policy kyoto_places_read on public.kyoto_places
  for select to anon, authenticated using (true);
create policy kyoto_places_add on public.kyoto_places
  for insert to anon, authenticated with check (source = 'user');
create policy kyoto_places_edit on public.kyoto_places
  for update to anon, authenticated using (true) with check (true);
-- Intentionally no delete policy.

-- Seed: the 79 book places (ids 1-79, source 'book') were loaded from src/data/places.json, then:
--   alter table public.kyoto_places alter column id restart with 80;
