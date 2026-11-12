import { createClient } from "@supabase/supabase-js";
import type { CategoryId, ConditionId } from "./config";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Profile = { display_name: string | null; course: string | null; year: string | null };

export type Item = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: CategoryId;
  condition: ConditionId | null;
  price_pence: number | null;
  original_price_pence: number | null;
  open_to_trade: boolean;
  status: "available" | "pending" | "traded";
  location: string | null;
  photo_url: string | null;
  pickup_window: string | null;
  created_at: string;
  seller?: Profile | null;
};

// Items with their seller's public profile attached.
export const ITEM_SELECT = "*, seller:profiles!owner_id(display_name, course, year)";

export const pounds = (pence: number) =>
  `£${pence % 100 === 0 ? pence / 100 : (pence / 100).toFixed(2)}`;

export const toPence = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

export function savePct(item: Pick<Item, "price_pence" | "original_price_pence">) {
  const { price_pence: p, original_price_pence: o } = item;
  if (p == null || !o || o <= p) return null;
  return Math.round(((o - p) / o) * 100);
}

export function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
