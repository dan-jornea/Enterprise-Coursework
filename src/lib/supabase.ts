import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const CATEGORIES = ["bike", "books", "clothes", "electronics", "furniture", "other"] as const;
export const CONDITIONS = ["new", "good", "fair", "worn"] as const;

export type Item = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: (typeof CATEGORIES)[number];
  condition: (typeof CONDITIONS)[number] | null;
  price_pence: number | null;
  open_to_trade: boolean;
  status: "available" | "pending" | "traded";
  created_at: string;
};

export const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
