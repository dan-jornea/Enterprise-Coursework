"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ArrowLeftRight, BadgeCheck, CalendarDays, CircleCheck, Clock, Flag, Handshake, MapPin, PoundSterling, ShieldCheck,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import ItemImage from "@/components/ItemImage";
import { SAFE_SPOTS, TIME_WINDOWS, UNIVERSITY, categoryLabel, conditionLabel } from "@/lib/config";
import { ITEM_SELECT, pounds, savePct, supabase, timeAgo, toPence, type Item } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

const REPORT_REASONS = ["Looks like a scam", "Not as described", "Prohibited or unsafe item", "Offensive content", "Other"];

function dateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

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
  const pickupWindow = TIME_WINDOWS.find((window) => window.id === item.pickup_window);

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
              <div className="fact">
                <Clock size={16} />
                <div>
                  <b>{pickupWindow?.label ?? "Ask the seller"}</b>
                  {pickupWindow && <span style={{ display: "block" }}>{pickupWindow.time}</span>}
                  <span style={{ display: "block" }}>Pickup time</span>
                </div>
              </div>
            </div>
          </section>

          {isOwner ? (
            <div className="panel stack">
              <div className="notice"><CircleCheck size={16} /><span>This is your listing. Offers appear on your <Link href="/offers">Offers</Link> page.</span></div>
              <Link href="/me" className="btn btn-ghost btn-block">Go to my listings to edit</Link>
            </div>
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
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [minDay, setMinDay] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [hasPendingOffer, setHasPendingOffer] = useState<boolean | null>(null);
  const [checkingOffer, setCheckingOffer] = useState(true);
  const [offerCheckError, setOfferCheckError] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setMinDay(dateInputValue(now));
      setCurrentTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }

    updateClock();
    const timer = window.setInterval(updateClock, 30_000);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDay(dateInputValue(tomorrow));
    setTime("14:00");
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setCheckingOffer(true);
    setOfferCheckError("");
    supabase
      .from("trade_offers")
      .select("id")
      .eq("wanted_item_id", item.id)
      .eq("offerer_id", userId)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setOfferCheckError(error.message);
          setHasPendingOffer(null);
        } else {
          setHasPendingOffer(data !== null);
        }
        setCheckingOffer(false);
      });
    return () => {
      active = false;
    };
  }, [item.id, userId]);

  const offered = mine.find((m) => m.id === offeredId);
  const cashPence = toPence(cash);
  const minimumOfferPence = item.price_pence == null ? 0 : Math.ceil(item.price_pence / 2);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "buy" && cashPence < minimumOfferPence) {
      return setError(`Your offer must be at least ${pounds(minimumOfferPence)} (50% of the seller's price).`);
    }
    if (mode === "swap" && !offeredId && cashPence === 0) return setError("Choose one of your items, add cash, or both.");
    if (!day || !time || new Date(`${day}T${time}`) < new Date()) return setError("Choose a day and time that is not in the past.");
    setBusy(true);
    const spotName = SAFE_SPOTS.find((s) => s.id === spot)?.name ?? null;
    const { error } = await supabase.from("trade_offers").insert({
      wanted_item_id: item.id,
      offered_item_id: mode === "swap" ? offeredId || null : null,
      offerer_id: userId,
      cash_pence: cashPence,
      message: message.trim() || null,
      meetup_spot: spotName,
      meetup_when: day && time
        ? `${new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${time}`
        : null,
    });
    setBusy(false);
    if (error?.code === "23505") {
      setHasPendingOffer(true);
      return;
    }
    if (error) return setError(error.message);
    setSent(true);
  }

  if (checkingOffer)
    return <div className="panel notice"><Clock size={16} /><span>Checking for an existing offer…</span></div>;

  if (offerCheckError)
    return <div className="panel notice amber" role="alert"><Clock size={16} /><span>Could not check for an existing offer. Refresh the page to try again. {offerCheckError}</span></div>;

  if (hasPendingOffer)
    return (
      <div className="panel stack">
        <div className="notice amber"><Clock size={16} /><span>You already have a pending offer for this item. Wait for the seller’s response before sending another.</span></div>
        <Link href="/offers" className="btn btn-ghost btn-block">View your offers</Link>
      </div>
    );

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
          <PoundSterling size={15} /> Buy
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

        {mode === "buy" && (
          <label className="field">
            <span>Your cash offer <span className="hint">(minimum {pounds(minimumOfferPence)})</span></span>
            <div className="input-prefix">
              <b>£</b>
              <input
                className="input"
                type="number"
                min={minimumOfferPence / 100}
                step="0.01"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder={item.price_pence != null ? (item.price_pence / 100).toFixed(2) : undefined}
                required
              />
            </div>
          </label>
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
          <div className="two">
            <label className="field">
              <span>Day</span>
              <input className="input" type="date" min={minDay} value={day} onChange={(e) => setDay(e.target.value)} required />
            </label>
            <label className="field">
              <span>Time</span>
              <input className="input" type="time" min={day === minDay ? currentTime : undefined} value={time} onChange={(e) => setTime(e.target.value)} required />
            </label>
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
      <button className="btn btn-report" style={{ alignSelf: "center" }} onClick={() => setOpen(true)}>
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
        <button className="btn btn-report" type="submit">Send report</button>
        <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
