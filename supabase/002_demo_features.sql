-- 002: features for the desktop demo.
-- Run AFTER schema.sql: SQL Editor -> New query -> paste -> Run.

-- 1. Extra item fields: photo, original price, location on campus, pickup window.
alter table items add column if not exists photo_url text;
alter table items add column if not exists original_price_pence int check (original_price_pence >= 0);
alter table items add column if not exists location text;
alter table items add column if not exists pickup_window text;

-- Add a kitchen category (interview task 3 asks testers to find kitchen items).
alter table items drop constraint if exists items_category_check;
alter table items add constraint items_category_check
  check (category in ('bike','books','clothes','electronics','furniture','kitchen','other'));

-- 2. Profile details collected at sign-up.
alter table profiles add column if not exists course text;
alter table profiles add column if not exists year text;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dom text := lower(split_part(new.email, '@', 2));
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uni_id int;
begin
  select id into uni_id from universities
  where dom = email_domain or dom like '%.' || email_domain;
  if uni_id is null then
    raise exception 'Please sign up with a supported university email address.';
  end if;
  insert into profiles (id, university_id, display_name, course, year)
  values (
    new.id,
    uni_id,
    coalesce(nullif(trim(meta->>'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(meta->>'course'), ''),
    nullif(trim(meta->>'year'), '')
  );
  return new;
end $$;

-- 3. Meetup details on trade offers (safe exchange spot + date/time).
alter table trade_offers add column if not exists meetup_spot text;
alter table trade_offers add column if not exists meetup_when text;

-- 4. Reports (interview task 6: "something about a listing looks wrong").
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
alter table reports enable row level security;
drop policy if exists "make reports" on reports;
create policy "make reports" on reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists "read own reports" on reports;
create policy "read own reports" on reports for select to authenticated
  using (reporter_id = auth.uid());

-- 5. End-of-year collection and storage requests (interview task 5).
create table if not exists collection_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('sell','store')),
  items_description text not null,
  boxes int not null default 0 check (boxes >= 0),
  large_items int not null default 0 check (large_items >= 0),
  item_condition text,
  collection_date date,
  collection_time time,
  location text,
  estimate_pence int,
  status text not null default 'requested' check (status in ('requested','scheduled','collected','cancelled')),
  created_at timestamptz not null default now()
);
alter table collection_requests add column if not exists collection_time time;
notify pgrst, 'reload schema';
alter table collection_requests enable row level security;
drop policy if exists "own requests" on collection_requests;
create policy "own requests" on collection_requests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A buyer can have only one pending offer per item at a time.
create unique index if not exists trade_offers_one_pending_per_buyer_item
  on trade_offers (wanted_item_id, offerer_id)
  where status = 'pending';

-- 6. Photo storage. Students upload into a folder named after their user id.
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
