"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, CATEGORIES, pounds, type Item } from "@/lib/supabase";

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let q = supabase.from("items").select("*").eq("status", "available").order("created_at", { ascending: false });
    if (category) q = q.eq("category", category);
    q.then(({ data }) => setItems((data as Item[]) ?? []));
  }, [signedIn, category]);

  if (signedIn === null) return null;
  if (!signedIn)
    return (
      <>
        <h1>Buy, sell and trade with students</h1>
        <p>Sign in with your university email to see what people near you are listing.</p>
        <Link href="/login">Sign in</Link>
      </>
    );

  return (
    <>
      <h1>Listings</h1>
      <p>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </p>
      {items.length === 0 && <p className="muted">Nothing listed yet.</p>}
      <div className="grid">
        {items.map((i) => (
          <Link key={i.id} href={`/items/${i.id}`} className="card">
            <h3>{i.title}</h3>
            <span className="tag">{i.category}</span>
            {i.open_to_trade && <span className="tag">open to trade</span>}
            <p className="muted">{i.price_pence != null ? pounds(i.price_pence) : "Trade only"}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
