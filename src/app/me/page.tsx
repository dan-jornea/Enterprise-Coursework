"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Plus, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import ItemImage from "@/components/ItemImage";
import { UNIVERSITY, categoryLabel } from "@/lib/config";
import { pounds, supabase, timeAgo, type Item } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

const STATUS: Record<Item["status"], string> = { available: "green", pending: "amber", traded: "grey" };

export default function Me() {
  const { user, profile } = useAuth(true);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase.from("items").select("*").eq("owner_id", uid).order("created_at", { ascending: false });
    setItems((data as Item[]) ?? []);
  }, []);
  useEffect(() => { if (user) load(user.id); }, [user, load]);

  async function remove(id: string) {
    if (!user) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) setError(error.message);
    load(user.id);
  }

  if (!user) return null;
  return (
    <>
      <section className="panel seller-card" style={{ marginBottom: 24 }}>
        <Avatar name={profile?.display_name ?? user.email} size={64} />
        <div style={{ flex: 1 }}>
          <h1 className="row" style={{ fontSize: 24 }}>
            {profile?.display_name ?? user.email}
            <span className="badge"><BadgeCheck size={13} /> Verified student</span>
          </h1>
          <p className="muted">{[profile?.year, profile?.course, UNIVERSITY.name].filter(Boolean).join(" · ")}</p>
          <p className="muted small">{user.email}</p>
        </div>
        <Link href="/items/new" className="btn btn-primary"><Plus size={16} /> New listing</Link>
      </section>

      <h2 style={{ marginBottom: 14 }}>My listings</h2>
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && (
        <div className="panel empty"><h3>No listings yet</h3><p>List something you no longer need.</p></div>
      )}
      <div className="list">
        {items?.map((i) => (
          <div key={i.id} className="panel listing-row">
            <Link href={`/items/${i.id}`} className="mini"><ItemImage category={i.category} photoUrl={i.photo_url} alt={i.title} iconSize={28} /></Link>
            <div style={{ minWidth: 0 }}>
              <Link href={`/items/${i.id}`} style={{ color: "inherit" }}><h3 className="truncate">{i.title}</h3></Link>
              <p className="muted small">{categoryLabel(i.category)} · {i.price_pence != null ? pounds(i.price_pence) : "Swap only"} · listed {timeAgo(i.created_at)}</p>
            </div>
            <span className={`badge ${STATUS[i.status]}`}>{i.status}</span>
            <button className="btn btn-danger" onClick={() => remove(i.id)}><Trash2 size={15} /> Remove</button>
          </div>
        ))}
      </div>
    </>
  );
}
