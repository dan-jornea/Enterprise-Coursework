"use client";
import { useCallback, useEffect, useState } from "react";
import { Banknote, CalendarDays, CircleCheck, Info, Package, Truck, Warehouse } from "lucide-react";
import { COLLECTION_PRICING, LOCATIONS } from "@/lib/config";
import { pounds, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type Request = {
  id: string;
  mode: "sell" | "store";
  items_description: string;
  boxes: number;
  large_items: number;
  collection_date: string | null;
  location: string | null;
  estimate_pence: number | null;
  status: string;
};

const ITEM_STATES = ["All working", "Some need a small fix", "Some don't work"];

export default function Storage() {
  const { user } = useAuth(true);
  const [mode, setMode] = useState<"sell" | "store">("sell");
  const [f, setF] = useState({ description: "", boxes: 1, large: 0, condition: ITEM_STATES[0], date: "", location: LOCATIONS[0] });
  const [requests, setRequests] = useState<Request[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    const { data } = await supabase.from("collection_requests").select("*").order("created_at", { ascending: false });
    setRequests((data as Request[]) ?? []);
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  const storeCost = f.boxes * COLLECTION_PRICING.storePerBoxPence + f.large * COLLECTION_PRICING.storePerLargeItemPence;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    if (f.boxes + f.large === 0) return setError("Add at least one box or large item.");
    setBusy(true);
    const { error } = await supabase.from("collection_requests").insert({
      user_id: user.id,
      mode,
      items_description: f.description.trim(),
      boxes: f.boxes,
      large_items: f.large,
      item_condition: mode === "sell" ? f.condition : null,
      collection_date: f.date || null,
      location: f.location,
      estimate_pence: mode === "store" ? storeCost : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setDone(true);
    setF((p) => ({ ...p, description: "" }));
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>End-of-year storage and collection</h1>
          <p>Moving out with more than you can carry? We collect it from your door.</p>
        </div>
      </div>

      <div className="steps">
        <div className="panel"><div className="step-n">1</div><h3>Book a collection</h3><p className="muted small">Tell us roughly what you have and when you move out.</p></div>
        <div className="panel"><div className="step-n">2</div><h3>We pick it up</h3><p className="muted small">Our partner collects from your accommodation on the day.</p></div>
        <div className="panel"><div className="step-n">3</div><h3>Cash back or September return</h3><p className="muted small">Sold items go to new students. Stored items come back to you.</p></div>
      </div>

      <div className="split">
        <form className="panel stack" onSubmit={submit}>
          <h2>What would you like to do?</h2>
          <div className="opt-grid">
            <button type="button" className={`opt row-opt ${mode === "sell" ? "on" : ""}`} onClick={() => setMode("sell")}>
              <span className="opt-ic"><Banknote size={18} /></span>
              <span><b>Sell to our partner</b><br /><small>Get cash back. Items go to new students in September.</small></span>
            </button>
            <button type="button" className={`opt row-opt ${mode === "store" ? "on" : ""}`} onClick={() => setMode("store")}>
              <span className="opt-ic"><Warehouse size={18} /></span>
              <span><b>Store over summer</b><br /><small>Coming back next year? Get your things back in September.</small></span>
            </button>
          </div>

          <label className="field">
            <span>What are you handing over?</span>
            <textarea className="input" rows={3} required value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. air fryer, kettle, desk lamp, duvet, two boxes of books" />
          </label>
          <div className="two">
            <label className="field">
              <span>Boxes</span>
              <input className="input" type="number" min={0} max={20} value={f.boxes} onChange={(e) => set("boxes", Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <label className="field">
              <span>Large items <span className="hint">(bike, chair, mini fridge)</span></span>
              <input className="input" type="number" min={0} max={10} value={f.large} onChange={(e) => set("large", Math.max(0, Number(e.target.value) || 0))} />
            </label>
          </div>
          {mode === "sell" && (
            <div className="field">
              <span className="field-label">Do they all work?</span>
              <div className="chips">
                {ITEM_STATES.map((s) => (
                  <button type="button" key={s} className={`chip ${f.condition === s ? "on" : ""}`} onClick={() => set("condition", s)}>{s}</button>
                ))}
              </div>
            </div>
          )}
          <div className="two">
            <label className="field">
              <span>Collection date</span>
              <input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
            </label>
            <label className="field">
              <span>Collect from</span>
              <select className="input" value={f.location} onChange={(e) => set("location", e.target.value)}>
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            <Truck size={18} /> {busy ? "Booking…" : "Request collection"}
          </button>
          {error && <p className="error">{error}</p>}
          {done && <div className="notice green"><CircleCheck size={16} /><span>Request sent. We'll confirm a time before your move-out date.</span></div>}
        </form>

        <aside className="sticky stack">
          <section className="panel stack">
            <h3>{mode === "store" ? "Storage estimate" : "How cash back works"}</h3>
            {mode === "store" ? (
              <>
                <div className="estimate">
                  <span className="muted">{f.boxes} box{f.boxes === 1 ? "" : "es"} · {f.large} large</span>
                  <span className="big">{pounds(storeCost)}</span>
                </div>
                <p className="muted small">
                  For the whole summer, including collection and return. {pounds(COLLECTION_PRICING.storePerBoxPence)} per box, {pounds(COLLECTION_PRICING.storePerLargeItemPence)} per large item.
                </p>
              </>
            ) : (
              <>
                <p className="muted small">
                  Our partner checks each item when it's collected and offers a price based on its condition. Working items get the best price.
                </p>
                {f.condition !== ITEM_STATES[0] && (
                  <div className="notice amber"><Info size={16} /><span>Items that need fixing are accepted case by case and get a lower price. Items that don't work can't be bought.</span></div>
                )}
              </>
            )}
            <div className="notice"><Info size={16} /><span>Demo prices only. They'll be updated after our student interviews.</span></div>
          </section>

          {requests.length > 0 && (
            <section className="panel stack">
              <h3>Your requests</h3>
              {requests.map((r) => (
                <div key={r.id} className="row" style={{ alignItems: "flex-start" }}>
                  <span className="opt-ic" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg)", display: "grid", placeItems: "center", flex: "none" }}>
                    {r.mode === "sell" ? <Banknote size={16} /> : <Package size={16} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{r.mode === "sell" ? "Sell to partner" : "Summer storage"}</b>
                    <p className="muted small truncate">{r.items_description}</p>
                    <p className="muted small"><CalendarDays size={12} style={{ verticalAlign: -1 }} /> {r.collection_date ?? "Date to confirm"} · {r.location}</p>
                  </div>
                  <span className="badge amber">{r.status}</span>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
