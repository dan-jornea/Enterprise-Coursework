// Fills the database with demo sellers and listings so the site isn't empty in interviews.
// Run with: npm run seed   (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
// Safe to re-run: it replaces the demo sellers' listings each time.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

// Fictional demo sellers. Random passwords: nobody logs in as them.
const SELLERS = [
  { email: "demo.maya@bath.ac.uk", name: "Maya", course: "Biomedical Sciences", year: "Final year" },
  { email: "demo.kai@bath.ac.uk", name: "Kai", course: "Computer Science", year: "2nd year" },
  { email: "demo.alex@bath.ac.uk", name: "Alex", course: "Natural Sciences", year: "3rd year" },
  { email: "demo.priya@bath.ac.uk", name: "Priya", course: "Architecture", year: "1st year" },
  { email: "demo.tom@bath.ac.uk", name: "Tom", course: "Management", year: "Final year" },
];

// [seller index, title, category, condition, price £ or null, price new £ or null, open to swap, location, pickup, description]
const ITEMS = [
  [0, "Compact fridge with freezer box", "kitchen", "new", 50, 140, true, "The Quads", "afternoon", "Moving out this week. Cleaned and defrosted, works perfectly. I can help carry it to the Quads reception."],
  [1, "TI-84 Plus graphing calculator", "electronics", "good", 35, 110, true, "Eastwood", "flexible", "Used for first-year maths. Fresh batteries included."],
  [2, "Organic chemistry course pack", "books", "fair", 20, 90, false, "Norwood House", "evening", "Textbook plus my annotated notes. Some highlighting."],
  [3, "Dual monitor arm with desk clamp", "electronics", "good", 18, null, true, "Woodland Court", "afternoon", "Holds two 24-inch screens. All screws included."],
  [3, "Air fryer, 4 litre", "kitchen", "good", 25, 80, true, "Polden Court", "evening", "Works great, basket is non-stick and clean."],
  [4, "Acoustic guitar with padded bag", "other", "good", 45, 150, true, "Westwood", "flexible", "Full size, new strings last month. Happy to swap for a bike."],
  [4, "Hybrid bike with D-lock", "bike", "good", 90, 320, true, "Westwood", "afternoon", "Medium frame, 21 gears. Serviced in September. Lock and lights included."],
  [0, "Kitchen starter set: pans, cutlery, plates", "kitchen", "fair", 15, 60, true, "The Quads", "afternoon", "Two pans, cutlery for four, four plates and bowls. Everything you need for first year."],
  [1, "Mesh desk chair", "furniture", "good", 28, 95, true, "Eastwood", "evening", "Adjustable height and arms. Fits under most desks."],
  [2, "Single duvet and two pillows", "other", "new", 12, 40, false, "Norwood House", "flexible", "Washed and bagged. Used for one term."],
  [3, "Winter coat, size M", "clothes", "good", null, 120, true, "Polden Court", "afternoon", "Warm puffer jacket. Swap only, looking for a desk lamp or kitchen stuff."],
  [4, "Desk lamp with USB port", "furniture", "worn", 6, 25, true, "Off campus (Bath)", "evening", "Small scratch on the base, works fine."],
];

async function findOrCreate(s) {
  const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = list.users.find((u) => u.email === s.email);
  if (existing) return existing.id;
  const { data, error: e2 } = await admin.auth.admin.createUser({
    email: s.email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { display_name: s.name, course: s.course, year: s.year },
  });
  if (e2) throw e2;
  return data.user.id;
}

const ids = [];
for (const s of SELLERS) ids.push(await findOrCreate(s));
console.log(`Demo sellers ready: ${ids.length}`);

await admin.from("items").delete().in("owner_id", ids);
const rows = ITEMS.map(([s, title, category, condition, price, orig, swap, location, pickup_window, description], i) => ({
  owner_id: ids[s],
  title,
  category,
  condition,
  price_pence: price == null ? null : price * 100,
  original_price_pence: orig == null ? null : orig * 100,
  open_to_trade: swap,
  location,
  pickup_window,
  description,
  // Stagger the listing times so "newest first" looks natural.
  created_at: new Date(Date.now() - i * 47 * 60000).toISOString(),
}));
const { data: listings, error } = await admin.from("items").insert(rows).select("id, title");
if (error) {
  console.error("Inserting items failed:", error.message);
  process.exit(1);
}
console.log(`Inserted ${rows.length} demo listings.`);

// Past trades and one report, so the demo sellers have ratings to show. The database works the
// ratings out itself (supabase/004_ratings.sql); this only supplies the history behind them.
// [seller index, seller index, trades between them]: Maya ends up with 18, Tom 12, Kai 8, Alex 4.
const PAST_TRADES = [[0, 4, 9], [0, 1, 6], [0, 2, 3], [4, 1, 2], [4, 2, 1]];
const PAST_TITLES = ["Desk fan", "Kettle", "Laundry basket", "Bedside lamp", "Monitor stand", "Bike lights", "Toaster", "Bookshelf", "Clothes rail", "Yoga mat"];

// Start the demo sellers' history from empty, so running this again doesn't count trades twice.
const cleared = await admin.from("reputation_events").delete().in("user_id", ids);
if (cleared.error) {
  console.log("Skipped the demo ratings: run supabase/004_ratings.sql first, then run this again.");
} else {
  await admin.from("user_reputation").delete().in("user_id", ids);

  // Take turns at being the seller. Each entry is [seller, buyer].
  const trades = [];
  for (const [a, b, count] of PAST_TRADES) {
    for (let k = 0; k < count; k++) trades.push(k % 2 === 0 ? [a, b] : [b, a]);
  }
  const price = (i) => 500 + (i % 6) * 300;
  const when = (i) => new Date(Date.now() - (i + 2) * 24 * 3600000).toISOString();

  const sold = await admin
    .from("items")
    .insert(trades.map(([seller], i) => ({
      owner_id: ids[seller],
      title: PAST_TITLES[i % PAST_TITLES.length],
      category: "other",
      condition: "good",
      price_pence: price(i),
      status: "traded",
      created_at: when(i),
    })))
    .select("id");
  const accepted = sold.error
    ? sold
    : await admin.from("trade_offers").insert(trades.map(([, buyer], i) => ({
        wanted_item_id: sold.data[i].id,
        offerer_id: ids[buyer],
        cash_pence: price(i),
        status: "accepted",
        created_at: when(i),
      })));

  // One report against Alex's listing, from Kai, so the demo includes a rating that has gone down.
  const reported = listings.find((l) => l.title === "Organic chemistry course pack");
  const report = accepted.error
    ? accepted
    : await admin.from("reports").insert({
        item_id: reported.id,
        reporter_id: ids[1],
        reason: "Not as described",
        details: "Demo report: shows how a report lowers a rating.",
      });

  if (report.error) {
    console.error("Adding the demo ratings failed:", report.error.message);
    process.exit(1);
  }
  console.log(`Added ${trades.length} past trades and 1 report for the demo ratings.`);
}
