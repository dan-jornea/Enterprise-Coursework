"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, pounds } from "@/lib/supabase";

type Offer = {
  id: string;
  offerer_id: string;
  cash_pence: number;
  message: string | null;
  status: string;
  wanted: { title: string; owner_id: string } | null;
  offered: { title: string } | null;
};

export default function Offers() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.push("/login");
    setUserId(u.user.id);
    const { data } = await supabase
      .from("trade_offers")
      .select("id, offerer_id, cash_pence, message, status, wanted:items!wanted_item_id(title, owner_id), offered:items!offered_item_id(title)")
      .order("created_at", { ascending: false });
    setOffers((data as unknown as Offer[]) ?? []);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function respond(id: string, action: "accept" | "decline" | "withdraw") {
    setError("");
    const res =
      action === "accept"
        ? await supabase.rpc("accept_offer", { offer_id: id })
        : await supabase.from("trade_offers").update({ status: action === "decline" ? "declined" : "withdrawn" }).eq("id", id);
    if (res.error) setError(res.error.message);
    load();
  }

  const incoming = offers.filter((o) => o.wanted?.owner_id === userId);
  const outgoing = offers.filter((o) => o.offerer_id === userId);

  const describe = (o: Offer) =>
    [o.offered?.title, o.cash_pence ? `${pounds(o.cash_pence)} cash` : null].filter(Boolean).join(" + ");

  return (
    <>
      <h1>Offers</h1>
      {error && <p className="error">{error}</p>}

      <h2>Received</h2>
      {incoming.length === 0 && <p className="muted">None yet.</p>}
      {incoming.map((o) => (
        <div key={o.id} className="card">
          <strong>{describe(o)}</strong> for your {o.wanted?.title}
          {o.message && <p className="muted">"{o.message}"</p>}
          <p className="muted">Status: {o.status}</p>
          {o.status === "pending" && (
            <div className="row">
              <button onClick={() => respond(o.id, "accept")}>Accept</button>
              <button className="secondary" onClick={() => respond(o.id, "decline")}>Decline</button>
            </div>
          )}
        </div>
      ))}

      <h2>Sent</h2>
      {outgoing.length === 0 && <p className="muted">None yet.</p>}
      {outgoing.map((o) => (
        <div key={o.id} className="card">
          <strong>{describe(o)}</strong> for {o.wanted?.title}
          <p className="muted">Status: {o.status}</p>
          {o.status === "pending" && (
            <button className="secondary" onClick={() => respond(o.id, "withdraw")}>Withdraw</button>
          )}
        </div>
      ))}
    </>
  );
}
