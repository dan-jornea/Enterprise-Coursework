"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowLeftRight, BadgeCheck, CalendarDays, CircleCheck, Clock, Flag, Handshake, MapPin, PoundSterling, ShieldCheck,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import ItemImage from "@/components/ItemImage";
import { SAFE_SPOTS, TIME_WINDOWS, UNIVERSITY, categoryLabel, conditionLabel, nextDays, windowLabel } from "@/lib/config";
import { ITEM_SELECT, pounds, savePct, supabase, timeAgo, toPence, type Item } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

const REPORT_REASONS = ["Looks like a scam", "Not as described", "Prohibited or unsafe item", "Offensive content", "Other"];

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth(true);
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [mine, setMine] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("items").select(ITEM_SELECT).eq("id", id).maybeSingle()
      .then(({ data }) => setItem((data as unknown as Item) ?? null));
    supabase.from("items").select("*").eq("owner_id", user.id).eq("status", "available").neq("id", id)
      .then(({ data }) => setMine((data as Item[]) ?? []));
  }, [id, user]);

  if (item === undefined) return null;
  if (item === null)
    return (
      <div className="panel empty">
        <h3>Listing not found</h3>
        <p>It may have been removed, or it belongs to another university.</p>
        <p style={{ marginTop: 16 }}><Link href="/" className="btn btn-ghost">Back to explore</Link></p>
      </div>
    );

  const isOwner = item.owner_id === user?.id;
  const save = savePct(item);

  return (
    <>
      <Link href="/" className="back"><ArrowLeft size={16} /> Back to explore</Link>
      <div className="split">
        <div className="stack">
          <div className="gallery">
            <ItemImage category={item.category} photoUrl={item.photo_url} alt={item.title} iconSize={120} />
            {item.condition && <span className="badge-float tl">Condition: {conditionLabel(item.condition)}</span>}
            <span className="badge-float bl"><Handshake size={13} /> Hand-over in person</span>
          </div>

          <section className="panel">
            <h2 style={{ marginBottom: 12 }}>About this item</h2>
            <div className="chips" style={{ marginBottom: 12 }}>
              <span className="badge grey">{categoryLabel(item.category)}</span>
              {item.condition && <span className="badge grey">{conditionLabel(item.condition)}</span>}
              {item.open_to_trade && <span className="badge"><ArrowLeftRight size={12} /> Open to swap</span>}
            </div>
            <p className="quote" style={{ marginTop: 0 }}>{item.description || "No description given."}</p>
          </section>

          <section className="panel">
            <div className="seller-card">
              <Avatar name={item.seller?.display_name} size={52} />
              <div style={{ flex: 1 }}>
                <h3>
                  {item.seller?.display_name ?? "Student"}
                  <span className="badge"><BadgeCheck size={13} /> @{UNIVERSITY.domain} verified</span>
                </h3>
                <p className="muted small">
                  {[item.seller?.year, item.seller?.course].filter(Boolean).join(" · ") || UNIVERSITY.name}
                </p>
              </div>
              <span className="muted small">Listed {timeAgo(item.created_at)}</span>
            </div>
          </section>
        </div>

        <aside className="sticky stack">
          <section className="panel">
            <div className="price-row">
              <span className="big-price">{item.price_pence != null ? pounds(item.price_pence) : "Swap only"}</span>
              {save && item.original_price_pence && <span className="was">{pounds(item.original_price_pence)} new</span>}
              {save && <span className="save">Save {save}%</span>}
            </div>
            <h1 className="detail-title">{item.title}</h1>
            <div className="facts">
              <div className="fact"><MapPin size={16} /><div><b>{item.location ?? "On campus"}</b>Pickup location</div></div>
              <div className="fact"><Clock size={16} /><div><b>{windowLabel(item.pickup_window) || "Ask the seller"}</b>Best hand-over time</div></div>
            </div>
          </section>

          {isOwner ? (
            <div className="panel notice"><CircleCheck size={16} /><span>This is your listing. Offers appear on your <Link href="/offers">Offers</Link> page.</span></div>
          ) : item.status !== "available" ? (
            <div className="panel notice amber"><Clock size={16} /><span>This item has already been traded.</span></div>
          ) : (
            <OfferPanel item={item} mine={mine} userId={user!.id} />
          )}

          {!isOwner && <ReportPanel itemId={item.id} userId={user!.id} />}
        </aside>
      </div>
    </>
  );
}

function OfferPanel({ item, mine, userId }: { item: Item; mine: Item[]; userId: string }) {
  const canSwap = item.open_to_trade;
  const canBuy = item.price_pence != null;
  const [mode, setMode] = useState<"swap" | "buy">(canSwap ? "swap" : "buy");
  const [offeredId, setOfferedId] = useState("");
  const [cash, setCash] = useState("");
  const [spot, setSpot] = useState(SAFE_SPOTS[0].id);
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState("");
  const [win, setWin] = useState(item.pickup_window ?? TIME_WINDOWS[0].id);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const d = nextDays(5);
    setDays(d);
    setDay(d[1]);
  }, []);

  const offered = mine.find((m) => m.id === offeredId);
  const cashPence = mode === "buy" ? item.price_pence ?? 0 : toPence(cash);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "swap" && !offeredId && cashPence === 0) return setError("Choose one of your items, add cash, or both.");
    setBusy(true);
    const spotName = SAFE_SPOTS.find((s) => s.id === spot)?.name ?? null;
    const w = TIME_WINDOWS.find((t) => t.id === win);
    const { error } = await supabase.from("trade_offers").insert({
      wanted_item_id: item.id,
      offered_item_id: mode === "swap" ? offeredId || null : null,
      offerer_id: userId,
      cash_pence: cashPence,
      message: message.trim() || null,
      meetup_spot: spotName,
      meetup_when: day && w ? `${day} · ${w.label} (${w.time})` : null,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  if (sent)
    return (
      <div className="panel stack">
        <div className="notice green"><CircleCheck size={16} /><span>Offer sent. You'll see the reply on your Offers page.</span></div>
        <Link href="/offers" className="btn btn-ghost btn-block">Go to offers</Link>
      </div>
    );

  return (
    <form className="panel" onSubmit={send}>
      <h2 style={{ marginBottom: 14 }}>Make an offer</h2>
      <div className="tabs">
        <button type="button" className={mode === "swap" ? "on" : ""} disabled={!canSwap} onClick={() => setMode("swap")}>
          <ArrowLeftRight size={15} /> Swap
        </button>
        <button type="button" className={mode === "buy" ? "on" : ""} disabled={!canBuy} onClick={() => setMode("buy")}>
          <PoundSterling size={15} /> Buy {canBuy ? pounds(item.price_pence!) : ""}
        </button>
      </div>

      <div className="stack">
        {mode === "swap" && (
          <>
            <label className="field">
              <span>Offer one of your items</span>
              <select className="input" value={offeredId} onChange={(e) => setOfferedId(e.target.value)}>
                <option value="">No item, cash only</option>
                {mine.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              {mine.length === 0 && (
                <span className="hint">You have no available listings. <Link href="/items/new">List something</Link> to swap it.</span>
              )}
            </label>
            <label className="field">
              <span>Add cash on top <span className="hint">(optional, evens out the value)</span></span>
              <div className="input-prefix"><b>£</b><input className="input" type="number" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" /></div>
            </label>
          </>
        )}

        <div className="field">
          <span className="field-label"><ShieldCheck size={14} style={{ verticalAlign: -2, color: "var(--blue)" }} /> Safe exchange spot</span>
          <div className="stack" style={{ gap: 8 }}>
            {SAFE_SPOTS.map((s) => (
              <button type="button" key={s.id} className={`opt row-opt ${spot === s.id ? "on" : ""}`} onClick={() => setSpot(s.id)}>
                <span className="opt-ic"><MapPin size={16} /></span>
                <span><b>{s.name}</b><br /><small>{s.note}</small></span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label"><CalendarDays size={14} style={{ verticalAlign: -2, color: "var(--blue)" }} /> Propose a day and time</span>
          <div className="chips">
            {days.map((d) => (
              <button type="button" key={d} className={`chip ${day === d ? "on" : ""}`} onClick={() => setDay(d)}>{d}</button>
            ))}
          </div>
          <div className="chips" style={{ marginTop: 4 }}>
            {TIME_WINDOWS.map((w) => (
              <button type="button" key={w.id} className={`chip soft ${win === w.id ? "on" : ""}`} onClick={() => setWin(w.id)}>
                {w.label} · {w.time}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Message <span className="hint">(optional)</span></span>
          <textarea className="input" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi! Is it still available?" />
        </label>

        <div className="summary">
          <span className="muted">You offer</span>
          <b>
            {[mode === "swap" ? offered?.title : null, cashPence ? pounds(cashPence) : null].filter(Boolean).join(" + ") || "Nothing yet"}
          </b>
        </div>
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          {busy ? "Sending…" : mode === "swap" ? "Send swap offer" : "Request to buy"}
        </button>
        {error && <p className="error">{error}</p>}
        <p className="muted small" style={{ textAlign: "center" }}>No payment is taken online. You pay or swap in person at the hand-over.</p>
      </div>
    </form>
  );
}

function ReportPanel({ itemId, userId }: { itemId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function report(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("reports").insert({ item_id: itemId, reporter_id: userId, reason, details: details.trim() || null });
    if (error) return setError(error.message);
    setDone(true);
  }

  if (done) return <div className="notice green"><CircleCheck size={16} /><span>Thanks. The team will review this listing.</span></div>;
  if (!open)
    return (
      <button className="link-btn" style={{ alignSelf: "center" }} onClick={() => setOpen(true)}>
        <Flag size={14} /> Report this listing
      </button>
    );
  return (
    <form className="panel stack" onSubmit={report}>
      <h3 className="row"><Flag size={16} color="var(--red)" /> Report this listing</h3>
      <div className="chips">
        {REPORT_REASONS.map((r) => (
          <button type="button" key={r} className={`chip ${reason === r ? "on" : ""}`} onClick={() => setReason(r)}>{r}</button>
        ))}
      </div>
      <textarea className="input" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What looks wrong? (optional)" />
      <div className="row">
        <button className="btn btn-danger" type="submit">Send report</button>
        <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
