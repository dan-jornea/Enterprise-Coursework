-- 004: student ratings ("4.9 Rating · 18 campus trades").
-- Run AFTER 003_storage_return_date.sql: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- How a rating is worked out (see refresh_reputation below):
--   * every student starts from three neutral 4-star votes,
--   * every completed trade (an accepted offer) adds one 5-star vote, for both students,
--   * every DIFFERENT student who reports one of their listings adds three 1-star votes
--     (reports marked 'dismissed' don't count).
-- The rating is the average of those votes. It rises with trades and falls with reports, and
-- one report hurts a newcomer far more than a student with a long history.
-- Students with no trades and no reports have no rating yet and show as "New".

-- 1. The history a rating is built from: one row per student per trade, one row per report.
--    Rows are NOT removed when a listing is deleted, so removing a listing can't erase a
--    trade or hide a report.
create table if not exists reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,  -- whose rating this affects
  kind text not null check (kind in ('sale','purchase','report')),
  other_user_id uuid references profiles(id) on delete set null,    -- trading partner, or who reported
  offer_id uuid,                                                     -- the accepted offer (sale / purchase)
  report_id uuid,                                                    -- the report
  counts boolean not null default true,                              -- false once a report is dismissed
  created_at timestamptz not null default now()
);
create unique index if not exists reputation_events_once_per_offer
  on reputation_events (offer_id, user_id) where offer_id is not null;
create unique index if not exists reputation_events_once_per_report
  on reputation_events (report_id) where report_id is not null;
create index if not exists reputation_events_user on reputation_events (user_id);

-- No policies on purpose: students can neither read nor write the history.
-- Only the functions in this file touch it.
alter table reputation_events enable row level security;
revoke all on reputation_events from anon, authenticated;

-- 2. The summary shown next to a student's name. Students can read it, never write it.
create table if not exists user_reputation (
  user_id uuid primary key references profiles(id) on delete cascade,
  rating numeric(2,1) not null check (rating between 1 and 5),
  trades_count int not null default 0,   -- completed trades, as seller or buyer
  sales_count int not null default 0,    -- the ones where this student was the seller
  updated_at timestamptz not null default now()
);
alter table user_reputation enable row level security;
revoke all on user_reputation from anon, authenticated;
grant select on user_reputation to authenticated;
drop policy if exists "read reputation" on user_reputation;
create policy "read reputation" on user_reputation for select to authenticated using (true);

-- 3. Work out one student's rating again from their history.
create or replace function refresh_reputation(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  sales int;
  purchases int;
  reporters int;
  trades int;
begin
  select count(*) filter (where kind = 'sale'),
         count(*) filter (where kind = 'purchase'),
         -- Several reports from the same student count once.
         count(distinct coalesce(other_user_id, id)) filter (where kind = 'report' and counts)
    into sales, purchases, reporters
  from reputation_events
  where user_id = target;
  trades := sales + purchases;

  if trades = 0 and reporters = 0 then
    delete from user_reputation where user_id = target;  -- nothing to go on: back to "New"
    return;
  end if;

  insert into user_reputation (user_id, rating, trades_count, sales_count, updated_at)
  values (
    target,
    -- 3 neutral 4-star votes + one 5-star vote per trade + three 1-star votes per reporter.
    round((3 * 4.0 + trades * 5.0 + reporters * 3 * 1.0) / (3 + trades + reporters * 3), 1),
    trades,
    sales,
    now()
  )
  on conflict (user_id) do update
    set rating = excluded.rating,
        trades_count = excluded.trades_count,
        sales_count = excluded.sales_count,
        updated_at = excluded.updated_at;
end $$;
revoke execute on function refresh_reputation(uuid) from public, anon, authenticated;

-- 4. A trade is completed when an offer becomes 'accepted'. Record it for both students.
create or replace function record_trade() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  seller uuid;
begin
  if new.status <> 'accepted' then return null; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'accepted' then return null; end if;
  end if;

  select owner_id into seller from items where id = new.wanted_item_id;
  if seller is null or seller = new.offerer_id then return null; end if;

  insert into reputation_events (user_id, kind, other_user_id, offer_id)
  values (seller, 'sale', new.offerer_id, new.id),
         (new.offerer_id, 'purchase', seller, new.id)
  on conflict do nothing;
  perform refresh_reputation(seller);
  perform refresh_reputation(new.offerer_id);
  return null;
end $$;

drop trigger if exists trade_offers_record_trade on trade_offers;
create trigger trade_offers_record_trade
  after insert or update of status on trade_offers
  for each row execute function record_trade();

-- 5. A report counts against the owner of the reported listing, until it is dismissed.
create or replace function record_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  seller uuid;
begin
  if tg_op = 'INSERT' then
    select owner_id into seller from items where id = new.item_id;
    if seller is null or seller = new.reporter_id then return null; end if;
    insert into reputation_events (user_id, kind, other_user_id, report_id, counts)
    values (seller, 'report', new.reporter_id, new.id, new.status <> 'dismissed')
    on conflict do nothing;
  else
    update reputation_events set counts = (new.status <> 'dismissed')
    where report_id = new.id
    returning user_id into seller;
  end if;
  if seller is not null then perform refresh_reputation(seller); end if;
  return null;
end $$;

drop trigger if exists reports_record_report on reports;
create trigger reports_record_report
  after insert or update of status on reports
  for each row execute function record_report();

-- 6. Rules for offers, so a trade can't be faked. Until now a student could mark their own
--    offer as accepted, or send an offer that was already accepted.
create or replace function guard_trade_offer() returns trigger
language plpgsql set search_path = public as $$
declare
  me uuid := auth.uid();
  wanted items;
  offered items;
begin
  -- Only requests that come straight from the app are checked. accept_offer(), the seed
  -- script and the SQL editor run as other database roles and are left alone.
  if current_user not in ('authenticated', 'anon') then return new; end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'A new offer has to start as pending.';
    end if;
    select * into wanted from items where id = new.wanted_item_id;
    if wanted.id is null or wanted.status <> 'available' then
      raise exception 'This listing is no longer available.';
    end if;
    if wanted.owner_id = new.offerer_id then
      raise exception 'You can''t make an offer on your own listing.';
    end if;
    if new.offered_item_id is not null then
      select * into offered from items where id = new.offered_item_id;
      if offered.id is null or offered.owner_id <> new.offerer_id or offered.status <> 'available' then
        raise exception 'You can only offer one of your own available listings.';
      end if;
    end if;
    return new;
  end if;

  -- After an offer is sent, the only thing a student may change is its status.
  if (new.id, new.wanted_item_id, new.offered_item_id, new.offerer_id, new.cash_pence,
      new.message, new.meetup_spot, new.meetup_when, new.created_at)
     is distinct from
     (old.id, old.wanted_item_id, old.offered_item_id, old.offerer_id, old.cash_pence,
      old.message, old.meetup_spot, old.meetup_when, old.created_at) then
    raise exception 'An offer can''t be changed after it is sent. Withdraw it and send a new one.';
  end if;
  if new.status = old.status then return new; end if;
  if old.status <> 'pending' then
    raise exception 'This offer has already been answered.';
  end if;
  if me = old.offerer_id then
    if new.status <> 'withdrawn' then
      raise exception 'You can only withdraw your own offer.';
    end if;
  elsif new.status <> 'declined' then
    -- The owner of the listing: declining is a plain update, accepting goes through accept_offer().
    raise exception 'Offers can only be accepted with accept_offer().';
  end if;
  return new;
end $$;

drop trigger if exists trade_offers_guard on trade_offers;
create trigger trade_offers_guard
  before insert or update on trade_offers
  for each row execute function guard_trade_offer();

-- 7. Accepting an offer. Same as before, plus: both listings must still be available, and every
--    other pending offer that involves either listing is closed, so nothing is traded twice.
create or replace function accept_offer(offer_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o trade_offers;
begin
  select * into o from trade_offers where id = offer_id and status = 'pending' for update;
  if o.id is null then raise exception 'Offer not found or already answered.'; end if;
  if not exists (select 1 from items where id = o.wanted_item_id and owner_id = auth.uid()) then
    raise exception 'Only the item owner can accept this offer.';
  end if;

  -- Lock both listings, then make sure neither was traded in the meantime.
  perform 1 from items where id in (o.wanted_item_id, o.offered_item_id) order by id for update;
  if exists (select 1 from items where id in (o.wanted_item_id, o.offered_item_id) and status <> 'available') then
    raise exception 'One of the items in this offer is no longer available.';
  end if;

  update trade_offers set status = 'accepted' where id = offer_id;
  update trade_offers set status = 'declined'
  where id <> offer_id and status = 'pending'
    and (wanted_item_id in (o.wanted_item_id, o.offered_item_id)
      or offered_item_id in (o.wanted_item_id, o.offered_item_id));
  update items set status = 'traded' where id in (o.wanted_item_id, o.offered_item_id);
end $$;

-- 8. The signed-in student's own figures, for their profile page. This is the only place the
--    number of reports is shown, and only to the student it is about.
drop function if exists my_reputation();
create function my_reputation()
returns table (rating numeric, trades_count int, sales_count int, purchases_count int, reports_count int)
language sql stable security definer set search_path = public as $$
  select
    (select r.rating from user_reputation r where r.user_id = auth.uid()),
    (count(*) filter (where e.kind in ('sale', 'purchase')))::int,
    (count(*) filter (where e.kind = 'sale'))::int,
    (count(*) filter (where e.kind = 'purchase'))::int,
    (count(distinct coalesce(e.other_user_id, e.id)) filter (where e.kind = 'report' and e.counts))::int
  from reputation_events e
  where e.user_id = auth.uid();
$$;
revoke execute on function my_reputation() from public, anon;
grant execute on function my_reputation() to authenticated;

-- 9. Record what happened before this file was run, then work out everyone's rating.
insert into reputation_events (user_id, kind, other_user_id, offer_id, created_at)
select i.owner_id, 'sale', o.offerer_id, o.id, o.created_at
from trade_offers o join items i on i.id = o.wanted_item_id
where o.status = 'accepted' and i.owner_id <> o.offerer_id
on conflict do nothing;

insert into reputation_events (user_id, kind, other_user_id, offer_id, created_at)
select o.offerer_id, 'purchase', i.owner_id, o.id, o.created_at
from trade_offers o join items i on i.id = o.wanted_item_id
where o.status = 'accepted' and i.owner_id <> o.offerer_id
on conflict do nothing;

insert into reputation_events (user_id, kind, other_user_id, report_id, counts, created_at)
select i.owner_id, 'report', r.reporter_id, r.id, r.status <> 'dismissed', r.created_at
from reports r join items i on i.id = r.item_id
where i.owner_id <> r.reporter_id
on conflict do nothing;

do $$
declare
  student record;
begin
  for student in select distinct user_id from reputation_events loop
    perform refresh_reputation(student.user_id);
  end loop;
end $$;

-- Make the API see the new tables and function straight away.
notify pgrst, 'reload schema';
