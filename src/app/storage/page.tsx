"use client";
import { useCallback, useEffect, useState } from "react";
import { Banknote, CalendarDays, CircleCheck, Info, Package, Pencil, Truck, Warehouse, X } from "lucide-react";
import { COLLECTION_PRICING, LOCATIONS } from "@/lib/config";
import { pounds, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type Request = {
  id: string;
  mode: "sell" | "store";
  items_description: string;
  boxes: number;
  large_items: number;
  item_condition: string | null;
  collection_date: string | null;
  collection_time: string | null;
  location: string | null;
  estimate_pence: number | null;
  status: string;
};

const ITEM_STATES = ["All working", "Some need a small fix", "Some don't work"];

function dateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function timeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function Storage() {
  const { user } = useAuth(true);
  const [mode, setMode] = useState<"sell" | "store">("sell");
  const [f, setF] = useState({ description: "", boxes: 1, large: 0, condition: ITEM_STATES[0], date: "", time: "", location: LOCATIONS[0] });
  const [minimumCollection, setMinimumCollection] = useState({ date: "", time: "" });
  const [requests, setRequests] = useState<Request[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    function updateMinimumCollection() {
      const minimum = new Date();
      minimum.setSeconds(0, 0);
      minimum.setMinutes(minimum.getMinutes() + 1);
      setMinimumCollection({ date: dateInputValue(minimum), time: timeInputValue(minimum) });
    }

    updateMinimumCollection();
    const timer = window.setInterval(updateMinimumCollection, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("collection_requests").select("*").order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    setRequests((data as Request[]) ?? []);
  }, []);
  useEffect(() => { if (user) load(); }, [user, load]);

  const storeCost = f.boxes * COLLECTION_PRICING.storePerBoxPence + f.large * COLLECTION_PRICING.storePerLargeItemPence;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    if (f.date && f.date < dateInputValue(new Date())) return setError("Collection date cannot be in the past.");
    if (f.date && f.time && new Date(`${f.date}T${f.time}`).getTime() <= Date.now()) {
      return setError("Collection date and time must be in the future.");
    }
    if (f.boxes + f.large === 0) return setError("Add at least one box or large item.");
    setBusy(true);
    const values = {
      mode,
      items_description: f.description.trim(),
      boxes: f.boxes,
      large_items: f.large,
      item_condition: mode === "sell" ? f.condition : null,
      collection_date: f.date || null,
      collection_time: f.time || null,
      location: f.location,
      estimate_pence: mode === "store" ? storeCost : null,
    };
    const result = editingId
      ? await supabase.from("collection_requests").update(values).eq("id", editingId).eq("status", "requested").select("id").single()
      : await supabase.from("collection_requests").insert({ ...values, user_id: user.id });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    setDone(editingId ? "Request updated." : "Request saved. We'll confirm a time before your move-out date.");
    setEditingId(null);
    setF({ description: "", boxes: 1, large: 0, condition: ITEM_STATES[0], date: "", time: "", location: LOCATIONS[0] });
    await load();
  }

  function editRequest(request: Request) {
    setEditingId(request.id);
    setMode(request.mode);
    setF({
      description: request.items_description,
      boxes: request.boxes,
      large: request.large_items,
      condition: request.item_condition ?? ITEM_STATES[0],
      date: request.collection_date ?? "",
      time: request.collection_time?.slice(0, 5) ?? "",
      location: request.location ?? LOCATIONS[0],
    });
    setDone("");
    setError("");
  }

  function stopEditing() {
    setEditingId(null);
    setF({ description: "", boxes: 1, large: 0, condition: ITEM_STATES[0], date: "", time: "", location: LOCATIONS[0] });
    setDone("");
    setError("");
  }

  async function cancelRequest(request: Request) {
    if (!window.confirm("Cancel this collection request?")) return;
    setError("");
    setBusy(true);
    const { error } = await supabase
      .from("collection_requests")
      .update({ status: "cancelled" })
      .eq("id", request.id)
      .in("status", ["requested", "scheduled"])
      .select("id")
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    if (editingId === request.id) stopEditing();
    await load();
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
        <form
          className="panel stack"
          onSubmit={submit}
          style={editingId ? { border: "2px solid var(--blue)", boxShadow: "0 0 0 4px var(--blue-soft)" } : undefined}
        >
          <h2>{editingId ? "Edit collection request" : "What would you like to do?"}</h2>
          {editingId && (
            <div className="notice">
              <Pencil size={16} />
              <span><b>Editing an existing request.</b> Saving will update it, not create a new collection request.</span>
            </div>
          )}
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
          <div className="three">
            <label className="field">
              <span>Collection date</span>
              <input className="input" type="date" min={minimumCollection.date} value={f.date} onChange={(e) => set("date", e.target.value)} />
            </label>
            <label className="field">
              <span>Collection time</span>
              <input className="input" type="time" min={f.date === minimumCollection.date ? minimumCollection.time : undefined} value={f.time} onChange={(e) => set("time", e.target.value)} />
            </label>
            <label className="field">
              <span>Collect from</span>
              <select className="input" value={f.location} onChange={(e) => set("location", e.target.value)}>
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            <Truck size={18} /> {busy ? "Saving…" : editingId ? "Save changes" : "Request collection"}
          </button>
          {editingId && (
            <button className="btn btn-ghost" type="button" onClick={stopEditing} disabled={busy}>
              <X size={16} /> Stop editing
            </button>
          )}
          {error && <p className="error">{error}</p>}
          {done && <div className="notice green"><CircleCheck size={16} /><span>{done}</span></div>}
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
              <p className="muted small">You can edit requests before they’re scheduled. Requested and scheduled collections can be cancelled.</p>
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="row"
                  style={{
                    alignItems: "flex-start",
                    ...(editingId === r.id ? { padding: 12, borderRadius: 12, background: "var(--blue-soft)", outline: "1px solid #bfd0ff" } : {}),
                  }}
                >
                  <span className="opt-ic" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bg)", display: "grid", placeItems: "center", flex: "none" }}>
                    {r.mode === "sell" ? <Banknote size={16} /> : <Package size={16} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{r.mode === "sell" ? "Sell to partner" : "Summer storage"}</b>
                    <p className="muted small truncate">{r.items_description}</p>
                    <p className="muted small"><CalendarDays size={12} style={{ verticalAlign: -1 }} /> {r.collection_date ?? "Date to confirm"} · {r.collection_time?.slice(0, 5) ?? "Time to confirm"} · {r.location}</p>
                  </div>
                  <span className="badge amber">{r.status}</span>
                  <div className="stack" style={{ gap: 6 }}>
                    {r.status === "requested" && (
                      <button className="btn btn-ghost" type="button" onClick={() => editRequest(r)} disabled={busy || editingId === r.id}>
                        <Pencil size={14} /> {editingId === r.id ? "Editing" : "Edit"}
                      </button>
                    )}
                    {(r.status === "requested" || r.status === "scheduled") && (
                      <button className="btn btn-danger" type="button" onClick={() => cancelRequest(r)} disabled={busy}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
