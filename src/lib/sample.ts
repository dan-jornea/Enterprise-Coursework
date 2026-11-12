import type { Item } from "./supabase";

// Static examples for the signed-out landing page preview. Not stored anywhere.
const base = { owner_id: "", description: null, status: "available" as const, photo_url: null, pickup_window: null, created_at: "" };

export const SAMPLE_ITEMS: Item[] = [
  { ...base, id: "s1", title: "Compact fridge with freezer", category: "kitchen", condition: "new", price_pence: 5000, original_price_pence: 14000, open_to_trade: true, location: "The Quads", seller: { display_name: "Maya", course: "Biomedical Sciences", year: "Final year" } },
  { ...base, id: "s2", title: "Hybrid bike + lock", category: "bike", condition: "good", price_pence: 9000, original_price_pence: 32000, open_to_trade: true, location: "Eastwood", seller: { display_name: "Kai", course: "Computer Science", year: "2nd year" } },
  { ...base, id: "s3", title: "Organic chemistry course pack", category: "books", condition: "fair", price_pence: 2000, original_price_pence: 9000, open_to_trade: false, location: "Norwood House", seller: { display_name: "Alex", course: "Natural Sciences", year: "3rd year" } },
];
