"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import ItemImage from "@/components/ItemImage";
import { categoryLabel } from "@/lib/config";
import { pounds, supabase, timeAgo, type Item } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

const STATUS: Record<Item["status"], string> = { available: "green", pending: "amber", traded: "grey" };

export default function MyListings() {
  const { user } = useAuth(true);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (uid: string) => {
    const { data, error: loadError } = await supabase
      .from("items")
      .select("*")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      setItems([]);
      return;
    }
    setError("");
    setItems((data as Item[]) ?? []);
  }, []);

  useEffect(() => { if (user) void load(user.id); }, [user, load]);

  async function remove(id: string) {
    if (!user) return;
    const { error: removeError } = await supabase.from("items").delete().eq("id", id);
    if (removeError) {
      setError(removeError.message);
      return;
    }
    await load(user.id);
  }

  if (!user) return null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My listings</h1>
          <p>Manage the items you have listed on the marketplace.</p>
        </div>
        <Link href="/items/new" className="btn btn-primary"><Plus size={16} /> New listing</Link>
      </div>
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && (
        <div className="panel empty"><h3>No listings yet</h3><p>List something you no longer need.</p></div>
      )}
      <div className="list">
        {items?.map((item) => (
          <div key={item.id} className="panel listing-row">
            <Link href={`/items/${item.id}`} className="mini">
              <ItemImage category={item.category} photoUrl={item.photo_url} alt={item.title} iconSize={28} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <Link href={`/items/${item.id}`} style={{ color: "inherit" }}><h3 className="truncate">{item.title}</h3></Link>
              <p className="muted small">{categoryLabel(item.category)} · {item.price_pence != null ? pounds(item.price_pence) : "No price set"} · listed {timeAgo(item.created_at)}</p>
            </div>
            <span className={`badge ${STATUS[item.status]}`}>{item.status}</span>
            <div className="stack" style={{ gap: 6 }}>
              <Link href={`/items/${item.id}/edit`} className="btn btn-ghost"><Pencil size={15} /> Edit</Link>
              <button className="btn btn-danger" onClick={() => remove(item.id)}><Trash2 size={15} /> Remove</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
