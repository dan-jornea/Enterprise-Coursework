-- 003: return date for summer storage requests.
-- Run AFTER 002_demo_features.sql: SQL Editor -> New query -> paste -> Run. Safe to re-run.

-- When stored items should come back to the student. Only used when mode = 'store'.
alter table collection_requests add column if not exists return_date date;

-- Items can't come back before they have been collected.
alter table collection_requests drop constraint if exists collection_requests_return_after_collection;
alter table collection_requests add constraint collection_requests_return_after_collection
  check (return_date is null or collection_date is null or return_date > collection_date);

-- Make the API see the new column straight away.
notify pgrst, 'reload schema';
