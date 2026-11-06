"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, pounds, type Item } from "@/lib/supabase";

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mine, setMine] = useState<Item[]>([]);
  const [offeredId, setOfferedId] = useState("");
  const [cash, setCash] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.push("/login");
      setUserId(u.user.id);
      const { data } = await supabase.from("items").select("*").eq("id", id).single();
      setItem(data as Item);
      const { data: own } = await supabase
        .from("items").select("*").eq("owner_id", u.user.id).eq("status", "available");
      setMine((own as Item[]) ?? []);
    })();
  }, [id, router]);

  async function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cash_pence = cash === "" ? 0 : Math.round(parseFloat(cash) * 100);
    if (!offeredId && cash_pence === 0) return setError("Offer an item, some cash, or both.");
    const { error } = await supabase.from("trade_offers").insert({
      wanted_item_id: id,
      offered_item_id: offeredId || null,
      offerer_id: userId,
      cash_pence,
      message: message || null,
    });
    if (error) return setError(error.message);
    setSent(true);
  }

  if (!item) return null;
  const isOwner = item.owner_id === userId;

  return (
    <>
      <h1>{item.title}</h1>
      <p>
        <span className="tag">{item.category}</span>
        {item.condition && <span className="tag">{item.condition}</span>}
      </p>
      <p>{item.description}</p>
      <p><strong>{item.price_pence != null ? pounds(item.price_pence) : "Trade only"}</strong></p>

      {isOwner && <p className="muted">This is your listing.</p>}
      {!isOwner && item.status === "available" && item.open_to_trade && !sent && (
        <>
          <h2>Make an offer</h2>
          <form onSubmit={sendOffer}>
            <label>Swap one of your items (optional)
              <select value={offeredId} onChange={(e) => setOfferedId(e.target.value)}>
                <option value="">No item, cash only</option>
                {mine.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </label>
            <label>Cash top-up in £ (optional)
              <input type="number" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} />
            </label>
            <label>Message
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <button type="submit">Send offer</button>
            {error && <p className="error">{error}</p>}
          </form>
        </>
      )}
      {sent && <p>Offer sent. Track it on the Offers page.</p>}
    </>
  );
}
