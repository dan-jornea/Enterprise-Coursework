# Uni Marketplace

Student-only marketplace for buying, selling and trading. Trading supports swaps with an optional cash top-up.

**Stack:** Next.js (App Router, TypeScript) + Supabase (auth, Postgres, row level security).

## Run it

1. Create a free project at supabase.com.
2. In the dashboard, open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key (**Project Settings > API**).
4. Install and start:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## What works

- Sign up is limited to university email domains (the `universities` table). Only `bath.ac.uk` is seeded.
- Supabase emails a confirmation link, so a student must control the inbox to join.
- Students only see listings from their own university (row level security).
- List an item with a price, trade only, or both.
- Offer a swap, cash, or swap plus cash. The owner accepts or declines.

## Not built yet

Messaging, ratings, reporting, image upload, profiles, SSO, the end-of-year buyback partner.

## Team workflow

- Never commit `.env.local`.
- Schema changes go in `supabase/schema.sql` and get announced in the group chat.
- One branch per feature, merge through pull requests.
- Suggested split:
  - Images + listing polish
  - Ratings and reports (trust and safety)
  - Messaging
  - Design and UX
  - Testing and user feedback for the Validation section
  - Report writing
