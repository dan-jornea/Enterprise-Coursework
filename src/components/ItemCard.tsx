import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import ItemImage from "./ItemImage";
import Avatar from "./Avatar";
import { RatingChip } from "./Rating";
import { conditionLabel } from "@/lib/config";
import type { Reputation } from "@/lib/reputation";
import { pounds, savePct, type Item } from "@/lib/supabase";

export default function ItemCard({
  item,
  preview = false,
  reputation = null,
}: {
  item: Item;
  preview?: boolean;
  reputation?: Reputation | null;
}) {
  const save = savePct(item);
  const body = (
    <>
      <div className="thumb">
        <ItemImage category={item.category} photoUrl={item.photo_url} alt={item.title} />
        {item.condition && <span className="badge-float tl">{conditionLabel(item.condition)}</span>}
      </div>
      <div className="card-body">
        <div className="price-row">
          <span className="price">{item.price_pence != null ? pounds(item.price_pence) : "Make an offer"}</span>
          {item.original_price_pence != null && item.price_pence != null && save && (
            <span className="was">{pounds(item.original_price_pence)}</span>
          )}
          {save && <span className="save">Save {save}%</span>}
        </div>
        <h3 className="card-title">{item.title || "Untitled item"}</h3>
        {item.location && (
          <p className="meta">
            <MapPin size={13} /> {item.location}
          </p>
        )}
        <p className="seller-line">
          <Avatar name={item.seller?.display_name} size={20} />
          <span className="truncate">
            {item.seller?.display_name ?? "Student"}
            {item.seller?.course ? ` · ${item.seller.course}` : ""}
          </span>
          <BadgeCheck size={14} className="verified-icon" />
          <RatingChip reputation={reputation} />
        </p>
      </div>
    </>
  );
  if (preview) return <div className="card-item">{body}</div>;
  return (
    <Link href={`/items/${item.id}`} className="card-item">
      {body}
    </Link>
  );
}
