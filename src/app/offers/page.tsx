"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, CalendarDays, MapPin, MessageSquare } from "lucide-react";
import ItemImage from "@/components/ItemImage";
import { pounds, supabase, timeAgo } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

type MiniItem = { id: string; title: string; category: string; photo_url: string | null; owner_id?: string };
type Offer = {
  id: string;
  offerer_id: string;
  cash_pence: number;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  meetup_spot: string | null;
  meetup_when: string | null;
  created_at: string;
  wanted: MiniItem | null;
  offered: MiniItem | null;
  offerer: { display_name: string | null } | null;
};

const STATUS: Record<Offer["status"], string> = { pending: "amber", accepted: "green", declined: "red", withdrawn: "grey" };

export default function Offers() {
  const { user } = useAuth(true);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [tab, setTab] = useState<"in" | "out" | "withdrawn">("in");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("trade_offers")
      .select(
        "id, offerer_id, cash_pence, message, status, meetup_spot, meetup_when, created_at, " +
          "wanted:items!wanted_item_id(id, title, category, photo_url, owner_id), " +
          "offered:items!offered_item_id(id, title, category, photo_url), " +
          "offerer:profiles!offerer_id(display_name)"
      )
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setOffers((data as unknown as Offer[]) ?? []);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function respond(id: string, action: "accept" | "decline" | "withdraw") {
    setError("");
    const res =
      action === "accept"
        ? await supabase.rpc("accept_offer", { offer_id: id })
        : await supabase.from("trade_offers").update({ status: action === "decline" ? "declined" : "withdrawn" }).eq("id", id);
    if (res.error) setError(res.error.message);
    load();
  }

  const withdrawn = (offers ?? []).filter((o) => o.status === "withdrawn");
  const incoming = (offers ?? []).filter((o) => o.wanted?.owner_id === user?.id && o.status !== "withdrawn");
  const outgoing = (offers ?? []).filter((o) => o.offerer_id === user?.id && o.status !== "withdrawn");
  const list = tab === "in" ? incoming : tab === "out" ? outgoing : withdrawn;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Offers</h1>
          <p>Swaps and buy requests for your items, and the offers you've made.</p>
        </div>
      </div>
      <div className="tabs" style={{ maxWidth: 620, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <button className={tab === "in" ? "on" : ""} onClick={() => setTab("in")}>Received ({incoming.length})</button>
        <button className={tab === "out" ? "on" : ""} onClick={() => setTab("out")}>Sent ({outgoing.length})</button>
        <button className={tab === "withdrawn" ? "on" : ""} onClick={() => setTab("withdrawn")}>Withdrawn ({withdrawn.length})</button>
      </div>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {offers && list.length === 0 && (
        <div className="panel empty">
          <h3>{tab === "withdrawn" ? "No withdrawn offers" : "No offers yet"}</h3>
          <p>{tab === "in" ? "When someone offers on your listings, it shows up here." : tab === "out" ? "Find something you like and make an offer." : "Withdrawn offers will show up here."}</p>
          {tab !== "withdrawn" && <p style={{ marginTop: 16 }}><Link href="/" className="btn btn-ghost">Explore listings</Link></p>}
        </div>
      )}

      <div className="list">
        {list.map((o) => {
          const isReceived = o.wanted?.owner_id === user?.id;
          return (
            <div key={o.id} className="panel offer">
              {o.offered ? (
                <div className="mini"><ItemImage category={o.offered.category} photoUrl={o.offered.photo_url} alt={o.offered.title} iconSize={28} /></div>
              ) : (
                <div className="mini cash">{pounds(o.cash_pence)}</div>
              )}
              <ArrowLeftRight className="swap-ic" size={22} />
              <Link href={`/items/${o.wanted?.id}`} className="mini">
                {o.wanted && <ItemImage category={o.wanted.category} photoUrl={o.wanted.photo_url} alt={o.wanted.title} iconSize={28} />}
              </Link>
              <div style={{ minWidth: 0 }}>
                <h3>
                  {[o.offered?.title, o.cash_pence ? `${pounds(o.cash_pence)} cash` : null].filter(Boolean).join(" + ")}
                  <span className="muted" style={{ fontWeight: 500 }}> for </span>
                  {isReceived ? "your " : ""}{o.wanted?.title}
                </h3>
                <span className={`badge ${STATUS[o.status]}`}>{o.status}</span>
                <span className="muted small" style={{ marginLeft: 8 }}>
                  {isReceived ? `From ${o.offerer?.display_name ?? "a student"} · ` : ""}{timeAgo(o.created_at)}
                </span>
                <div className="meta-list">
                  {o.meetup_spot && <span><MapPin size={13} /> {o.meetup_spot}</span>}
                  {o.meetup_when && <span><CalendarDays size={13} /> {o.meetup_when}</span>}
                  {o.message && <span><MessageSquare size={13} /> “{o.message}”</span>}
                </div>
              </div>
              <div className="row">
                {o.status === "pending" && tab === "in" && isReceived && (
                  <>
                    <button className="btn btn-primary" onClick={() => respond(o.id, "accept")}>Accept</button>
                    <button className="btn btn-ghost" onClick={() => respond(o.id, "decline")}>Decline</button>
                  </>
                )}
                {o.status === "pending" && tab === "out" && !isReceived && (
                  <button className="btn btn-ghost" onClick={() => respond(o.id, "withdraw")}>Withdraw</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
