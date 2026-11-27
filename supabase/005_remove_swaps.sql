-- 005: remove swaps. Students only buy and sell: an offer is an amount of money for one listing.
-- Safe to run more than once.

-- 1. Close any pending offer that still includes an item, then stop new ones being made.
update trade_offers set status = 'declined'
  where status = 'pending' and offered_item_id is not null;

alter table trade_offers drop constraint if exists trade_offers_cash_only;
alter table trade_offers add constraint trade_offers_cash_only
  check (offered_item_id is null) not valid;  -- old, closed offers are left as they were

-- 2. Every offer must be for some money.
alter table trade_offers drop constraint if exists trade_offers_cash_positive;
alter table trade_offers add constraint trade_offers_cash_positive
  check (cash_pence > 0) not valid;

-- 3. Listings no longer have an "open to swap" option.
alter table items drop column if exists open_to_trade;
