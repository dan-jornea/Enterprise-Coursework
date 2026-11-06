"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, CATEGORIES, CONDITIONS } from "@/lib/supabase";

export default function NewItem() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", category: "other", condition: "good", price: "", open_to_trade: true,
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.push("/login");
    const price_pence = form.price === "" ? null : Math.round(parseFloat(form.price) * 100);
    if (price_pence === null && !form.open_to_trade) return setError("Set a price or allow trades.");
    const { data: row, error } = await supabase
      .from("items")
      .insert({
        owner_id: data.user.id,
        title: form.title,
        description: form.description || null,
        category: form.category,
        condition: form.condition,
        price_pence,
        open_to_trade: form.open_to_trade,
      })
      .select("id")
      .single();
    if (error) return setError(error.message);
    router.push(`/items/${row.id}`);
  }

  return (
    <>
      <h1>List an item</h1>
      <form onSubmit={submit}>
        <label>Title <input required value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
        <label>Description <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label>Category
          <select value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Condition
          <select value={form.condition} onChange={(e) => set("condition", e.target.value)}>
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Price in £ (leave empty for trade only)
          <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
        </label>
        <label className="row">
          <input type="checkbox" checked={form.open_to_trade} onChange={(e) => set("open_to_trade", e.target.checked)} />
          Open to trades
        </label>
        <button type="submit">Publish</button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
