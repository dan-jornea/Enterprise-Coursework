import { Star } from "lucide-react";
import type { Reputation } from "@/lib/reputation";

const trades = (count: number) => `${count} campus trade${count === 1 ? "" : "s"}`;

// Compact rating for cards and lists: ★ 4.9 (18). Renders nothing when there is no rating data.
export function RatingChip({ reputation }: { reputation: Reputation | null }) {
  if (!reputation) return null;
  if (reputation.rating == null) {
    return (
      <span className="rating-chip new" title="New member: no trades yet">
        <Star size={13} /> New
      </span>
    );
  }
  return (
    <span className="rating-chip" title={`${reputation.rating.toFixed(1)} rating · ${trades(reputation.trades)}`}>
      <Star size={13} fill="currentColor" />
      <b>{reputation.rating.toFixed(1)}</b>
      <span>({reputation.trades})</span>
    </span>
  );
}

// The two-line block: ★ 4.9 Rating / 18 campus trades.
export function RatingSummary({ reputation }: { reputation: Reputation | null }) {
  if (!reputation) return null;
  const rated = reputation.rating != null;
  return (
    <div className="rating-summary">
      <Star size={22} className={rated ? "on" : undefined} fill={rated ? "currentColor" : "none"} />
      <div>
        <b>{rated ? `${reputation.rating!.toFixed(1)} Rating` : "New member"}</b>
        <span>{reputation.trades > 0 ? trades(reputation.trades) : "No trades yet"}</span>
      </div>
    </div>
  );
}

// Five stars, filled as far as the rating goes.
export function StarMeter({ rating, size = 18 }: { rating: number | null; size?: number }) {
  const filled = rating == null ? 0 : Math.max(0, Math.min(100, (rating / 5) * 100));
  const row = [0, 1, 2, 3, 4].map((index) => <Star key={index} size={size} fill="currentColor" strokeWidth={0} />);
  return (
    <span className="star-meter" role="img" aria-label={rating == null ? "No rating yet" : `${rating.toFixed(1)} out of 5`}>
      <span className="star-meter-off">{row}</span>
      <span className="star-meter-on" style={{ width: `${filled}%` }}>{row}</span>
    </span>
  );
}
