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

**Two newer features need one more SQL file each.** Run them in the SQL Editor after `002`, in this order: `supabase/003_storage_return_date.sql` (return date on storage requests), then `supabase/004_ratings.sql` (ratings). The site works without them: until a file has been run, its feature simply stays hidden.

## Pages and the interview tasks they cover

| Interview task (Feedback Plan, Part 3) | Page |
|---|---|
| 1. Sign up and verify your student account | `/login`: only `@bath.ac.uk` emails, confirmation link by email. The SSO button explains that it isn't connected yet. |
| 2. List an item you want to sell | `/items/new`: photo, category, condition, pickup place and time, price, open to swaps, live preview |
| 3. Find a bike or kitchen items | `/`: search, category and location filters, sorting |
| 4. Offer to swap one of your items | `/items/[id]`: swap (item + optional cash) or buy, safe exchange spot, day and time. Replies on `/offers`. |
| 5. Lots of things left on your last day | `/storage`: sell to the partner or store over summer, with an estimate |
| 6. Something about a listing looks wrong | "Report this listing" on every item page (saved to `reports`) |

`/me` shows your listings and lets you edit or remove them. `/account` is your profile: your rating, and forms to change your details.

## Ratings

Every student has a rating next to their name, for example **4.9 Rating · 18 campus trades**. It appears on listing cards, on the listing page, on offers you receive and on your own profile.

The database works it out, in `supabase/004_ratings.sql`:

- everyone starts from three neutral 4-star votes,
- each completed trade (an accepted offer) adds one 5-star vote, for both students,
- each different student who reports one of their listings adds three 1-star votes.

The rating is the average of those votes, so it rises with trades and falls with reports. Students with no trades and no reports show as "New". Students can't change their own rating, and deleting a listing doesn't remove the trades or reports that came from it. To cancel a report that turned out to be wrong, set its `status` to `dismissed` in the Supabase table editor.

Once `004` has been run, `npm run seed` also gives the demo sellers some past trades, so there are ratings to look at.

## Where to change things

- `src/lib/config.ts`: brand name, university, categories, campus locations, safe exchange spots, time windows, the storage box size, and the **placeholder storage prices**. Update the prices once you have the interview pricing answers.
- `src/app/globals.css`: all styling (colours are CSS variables at the top).
- Schema changes go in a new numbered SQL file (`003_...sql`). Announce them in the group chat, because everyone shares one database.

## Honest limits (say these in the report)

- **SSO** isn't connected. Real University of Bath SSO needs the university's approval.
- **Payments** aren't taken online. Students pay or swap in person.
- **Reports** are stored, but there's no admin screen yet. Read them in the Supabase table editor.
- **Collection requests** are stored only. No partner receives them yet.
- **Photos** are in a public bucket. Anyone with a photo's link can view it, but listings themselves are students-only.
- **No messaging yet.** The offer message and meetup details cover first contact.
- **Ratings** are automatic. Students can't write reviews, and two students could raise each other's rating by trading back and forth.

## Team workflow

- Never commit `.env.local`. The service role key bypasses all security rules.
- Use one branch per feature and merge through pull requests.
- Possible next tasks: an admin view for reports, written reviews after a completed trade, messaging, and more photos per listing.
