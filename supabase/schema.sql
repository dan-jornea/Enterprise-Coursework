-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1. Supported universities. Add more rows to open up more campuses.
create table universities (
  id serial primary key,
  name text not null,
  email_domain text not null unique
);
insert into universities (name, email_domain) values ('University of Bath', 'bath.ac.uk');

-- 2. Profiles (one per auth user)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  university_id int not null references universities(id),
  display_name text,
  created_at timestamptz not null default now()
);

-- Block sign-ups from non-university emails and create the profile.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dom text := lower(split_part(new.email, '@', 2));
  uni_id int;
begin
  select id into uni_id from universities
  where dom = email_domain or dom like '%.' || email_domain;
  if uni_id is null then
    raise exception 'Please sign up with a supported university email address.';
  end if;
  insert into profiles (id, university_id, display_name)
  values (new.id, uni_id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Items
create table items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  university_id int not null references universities(id),
  title text not null,
  description text,
  category text not null check (category in ('bike','books','clothes','electronics','furniture','other')),
  condition text check (condition in ('new','good','fair','worn')),
  price_pence int check (price_pence >= 0),      -- null = trade only
  open_to_trade boolean not null default true,
  status text not null default 'available' check (status in ('available','pending','traded')),
  created_at timestamptz not null default now()
);

-- Stamp the owner's university on every new item.
create function set_item_university() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.university_id := (select university_id from profiles where id = new.owner_id);
  return new;
end $$;

create trigger items_set_university
  before insert on items
  for each row execute function set_item_university();

-- 4. Trade offers: swap one item for another, with an optional cash top-up.
create table trade_offers (
  id uuid primary key default gen_random_uuid(),
  wanted_item_id uuid not null references items(id) on delete cascade,
  offered_item_id uuid references items(id) on delete set null, -- null = cash only
  offerer_id uuid not null references profiles(id) on delete cascade,
  cash_pence int not null default 0 check (cash_pence >= 0),
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now()
);

-- 5. Row level security: students only see their own university's items.
alter table profiles enable row level security;
alter table items enable row level security;
alter table trade_offers enable row level security;

create policy "read profiles" on profiles for select to authenticated using (true);
create policy "update own profile" on profiles for update to authenticated using (id = auth.uid());

create policy "read own uni items" on items for select to authenticated
  using (university_id = (select university_id from profiles where id = auth.uid()));
create policy "insert own items" on items for insert to authenticated
  with check (owner_id = auth.uid());
create policy "update own items" on items for update to authenticated
  using (owner_id = auth.uid());
create policy "delete own items" on items for delete to authenticated
  using (owner_id = auth.uid());

create policy "read my offers" on trade_offers for select to authenticated
  using (
    offerer_id = auth.uid()
    or wanted_item_id in (select id from items where owner_id = auth.uid())
  );
-- Accepting an offer touches the other student's item, so it runs as a function.
create function accept_offer(offer_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o trade_offers;
begin
  select * into o from trade_offers where id = offer_id and status = 'pending';
  if o.id is null then raise exception 'Offer not found or already answered.'; end if;
  if not exists (select 1 from items where id = o.wanted_item_id and owner_id = auth.uid()) then
    raise exception 'Only the item owner can accept this offer.';
  end if;
  update trade_offers set status = 'accepted' where id = offer_id;
  update trade_offers set status = 'declined'
    where wanted_item_id = o.wanted_item_id and id <> offer_id and status = 'pending';
  update items set status = 'traded' where id in (o.wanted_item_id, o.offered_item_id);
end $$;

create policy "make offers" on trade_offers for insert to authenticated
  with check (offerer_id = auth.uid());
create policy "respond to offers" on trade_offers for update to authenticated
  using (
    offerer_id = auth.uid()
    or wanted_item_id in (select id from items where owner_id = auth.uid())
  );
