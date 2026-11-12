# UniTrade: student marketplace demo

A students-only marketplace for buying, selling and swapping, with end-of-year storage and collection. Built as the website demo for the CM32027 coursework. It's designed for desktop and laptop screens.

**Stack:** Next.js (App Router, TypeScript) + Supabase (auth, Postgres, row level security, storage). Icons from `lucide-react`.

## Set it up

1. Create a free project at supabase.com.
2. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/002_demo_features.sql`. If you ran `schema.sql` already, only run `002`.
3. Copy `.env.example` to `.env.local` and fill in the URL, the anon key and the service role key (**Project Settings > API**).
4. Run:

```bash
npm install
npm run seed   # optional: adds 5 demo sellers and 12 listings
npm run dev
```

Open http://localhost:3000.

**Testing sign-up quickly:** Supabase's free email sending is rate-limited. You can turn off **Authentication > Providers > Email > Confirm email** while building. Turn it back on for interviews, because it's what backs the "verified student" claim.

## Pages and the interview tasks they cover

| Interview task (Feedback Plan, Part 3) | Page |
|---|---|
| 1. Sign up and verify your student account | `/login`: only `@bath.ac.uk` emails, confirmation link by email. The SSO button explains that it isn't connected yet. |
| 2. List an item you want to sell | `/items/new`: photo, category, condition, pickup place and time, price, open to swaps, live preview |
| 3. Find a bike or kitchen items | `/`: search, category and location filters, sorting |
| 4. Offer to swap one of your items | `/items/[id]`: swap (item + optional cash) or buy, safe exchange spot, day and time. Replies on `/offers`. |
| 5. Lots of things left on your last day | `/storage`: sell to the partner or store over summer, with an estimate |
| 6. Something about a listing looks wrong | "Report this listing" on every item page (saved to `reports`) |

`/me` shows your profile and listings and lets you remove them.

## Where to change things

- `src/lib/config.ts`: brand name, university, categories, campus locations, safe exchange spots, time windows, and the **placeholder storage prices**. Update the prices once you have the interview pricing answers.
- `src/app/globals.css`: all styling (colours are CSS variables at the top).
- Schema changes go in a new numbered SQL file (`003_...sql`). Announce them in the group chat, because everyone shares one database.

## Honest limits (say these in the report)

- **SSO** isn't connected. Real University of Bath SSO needs the university's approval.
- **Payments** aren't taken online. Students pay or swap in person.
- **Reports** are stored, but there's no admin screen yet. Read them in the Supabase table editor.
- **Collection requests** are stored only. No partner receives them yet.
- **Photos** are in a public bucket. Anyone with a photo's link can view it, but listings themselves are students-only.
- **No messaging or ratings yet.** The offer message and meetup details cover first contact.

## Team workflow

- Never commit `.env.local`. The service role key bypasses all security rules.
- Use one branch per feature and merge through pull requests.
- Possible next tasks: an admin view for reports, ratings after a completed trade, messaging, and more photos per listing.
