// Everything demo-specific lives here, so the team can rename or retune it in one place.

export const BRAND = "UniTrade";
export const UNIVERSITY = { name: "University of Bath", short: "Bath", domain: "bath.ac.uk" };

// Must match the rows in the `universities` table. The database trigger is the real check;
// this list only gives a friendly error before the request is sent.
export const ALLOWED_DOMAINS = [UNIVERSITY.domain];

export const CATEGORIES = [
  { id: "furniture", label: "Furniture" },
  { id: "books", label: "Textbooks" },
  { id: "electronics", label: "Tech" },
  { id: "kitchen", label: "Kitchen" },
  { id: "bike", label: "Bikes" },
  { id: "clothes", label: "Clothes" },
  { id: "other", label: "Other" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const CONDITIONS = [
  { id: "new", label: "Like new", hint: "Flawless, barely used" },
  { id: "good", label: "Good", hint: "Light wear, works perfectly" },
  { id: "fair", label: "Fair", hint: "Visible wear, fully working" },
  { id: "worn", label: "Needs love", hint: "Scratches or small repairs" },
] as const;
export type ConditionId = (typeof CONDITIONS)[number]["id"];
export const conditionLabel = (id: string | null) => CONDITIONS.find((c) => c.id === id)?.label ?? "";

export const LOCATIONS = [
  "The Quads",
  "Eastwood",
  "Polden Court",
  "Norwood House",
  "Woodland Court",
  "Westwood",
  "Off campus (Bath)",
];

// Placeholder meeting spots for the demo. Confirm them with the SU before real use.
export const SAFE_SPOTS = [
  { id: "su", name: "The Students' Union", note: "Busy indoor space" },
  { id: "library", name: "Library foyer", note: "Public, plenty of people around" },
  { id: "quads", name: "The Quads courtyard", note: "Open space next to accommodation" },
];

export const TIME_WINDOWS = [
  { id: "morning", label: "Morning", time: "09:00 – 12:00" },
  { id: "afternoon", label: "Afternoon", time: "12:00 – 18:00" },
  { id: "evening", label: "Evening", time: "18:00 – 21:00" },
  { id: "flexible", label: "Flexible", time: "Between lectures" },
];
export const windowLabel = (id: string | null) => {
  const w = TIME_WINDOWS.find((t) => t.id === id);
  return w ? `${w.label} (${w.time})` : "";
};

export const YEARS = ["1st year", "2nd year", "3rd year", "Final year", "Placement", "Postgraduate"];

// PLACEHOLDER prices for the demo only. Replace them with what you learn from the
// pricing questions in the interviews (Feedback Plan, Part 5).
export const COLLECTION_PRICING = {
  storePerBoxPence: 1200,
  storePerLargeItemPence: 2500,
};

// The standard box used for collections. PLACEHOLDER size for the demo.
// Anything that doesn't fit inside one counts as a large item.
export const STORAGE_BOX = { widthCm: 46, depthCm: 46, heightCm: 46 };

export function nextDays(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
