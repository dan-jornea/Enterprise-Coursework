"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Lock, PiggyBank, Recycle, Search, ShieldCheck, Truck } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { CATEGORIES, LOCATIONS, UNIVERSITY, categoryLabel } from "@/lib/config";
import { SAMPLE_ITEMS } from "@/lib/sample";
import { ITEM_SELECT, supabase, type Item } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Feed /> : <Landing />;
}

function Landing() {
  return (
    <>
      <section className="hero">
        <div>
          <span className="badge">
            <BadgeCheck size={14} /> Verified {UNIVERSITY.name} students only
          </span>
          <h1>
            Buy, sell and <em>swap</em> with students on your campus.
          </h1>
          <p className="lead">
            Pick up what you need for less, pass on what you don't, and hand over in person at safe spots on
            campus. When you move out, we'll collect what you can't take home.
          </p>
          <div className="row">
            <Link href="/login" className="btn btn-primary btn-lg">
              Join with your university email <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="hero-cards">
          {SAMPLE_ITEMS.map((i) => (
            <ItemCard key={i.id} item={i} preview />
          ))}
        </div>
      </section>

      <section className="features">
        <div className="panel feature">
          <div className="ic"><PiggyBank size={22} /></div>
          <h3>Spend less, get money back</h3>
          <p>Buy second-hand from other students, then sell or swap things on when you're done with them.</p>
        </div>
        <div className="panel feature">
          <div className="ic"><Lock size={22} /></div>
          <h3>Students only</h3>
          <p>Every account needs a confirmed @{UNIVERSITY.domain} email. Meet at public spots on campus and report anything that looks wrong.</p>
        </div>
        <div className="panel feature">
          <div className="ic"><Recycle size={22} /></div>
          <h3>Less waste at move-out</h3>
          <p>Leaving in June? Sell items to our collection partner or store them over summer instead of binning them.</p>
        </div>
      </section>

      <section className="cta-band">
        <Truck size={34} />
        <div>
          <h2>End-of-year storage and collection</h2>
          <p>We collect what you can't carry home, then store it for you or pass it on to new students in September.</p>
        </div>
        <span className="spacer" />
        <Link href="/login" className="btn btn-ghost">Sign in to book</Link>
      </section>
    </>
  );
}

const SORTS = [
  { id: "new", label: "Newest first" },
  { id: "low", label: "Price: low to high" },
  { id: "high", label: "Price: high to low" },
];

function Feed() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [loc, setLoc] = useState("");
  const [swapOnly, setSwapOnly] = useState(false);
  const [sort, setSort] = useState("new");

  useEffect(() => {
    supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setItems((data as unknown as Item[]) ?? []));
  }, []);

  const shown = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (!cat || i.category === cat) &&
        (!loc || i.location === loc) &&
        (!swapOnly || i.open_to_trade) &&
        (!needle ||
          [i.title, i.description, categoryLabel(i.category), i.location]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle))
    );
    if (sort === "new") return list;
    const price = (i: Item) => i.price_pence ?? Number.POSITIVE_INFINITY;
    return [...list].sort((a, b) =>
      sort === "low" ? price(a) - price(b) : (b.price_pence ?? -1) - (a.price_pence ?? -1)
    );
  }, [items, q, cat, loc, swapOnly, sort]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Explore the marketplace</h1>
          <p>Everything here is listed by verified {UNIVERSITY.name} students.</p>
        </div>
        <span className="badge green">
          <ShieldCheck size={14} /> 100% @{UNIVERSITY.domain}
        </span>
      </div>

      <div className="search">
        <Search size={20} />
        <input
          placeholder="Search bikes, textbooks, kitchen sets, mini fridges…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="filters">
        <div className="filter-row">
          <span className="filter-label">Category</span>
          <div className="chips">
            <button className={`chip ${cat === "" ? "on" : ""}`} onClick={() => setCat("")}>All</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={`chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(cat === c.id ? "" : c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-label">Near</span>
          <div className="chips">
            <button className={`chip soft ${loc === "" ? "on" : ""}`} onClick={() => setLoc("")}>Anywhere</button>
            {LOCATIONS.map((l) => (
              <button key={l} className={`chip soft ${loc === l ? "on" : ""}`} onClick={() => setLoc(loc === l ? "" : l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Link href="/storage" className="promo" style={{ color: "inherit" }}>
        <span className="ic"><Truck size={22} /></span>
        <div>
          <h3>Leaving in June?</h3>
          <p>Sell what you can't carry home to our collection partner, or store it over summer.</p>
        </div>
        <span className="spacer" />
        <span className="btn btn-ghost">Storage & collection <ArrowRight size={16} /></span>
      </Link>

      <div className="toolbar">
        <h2>
          Campus feed <span className="badge grey">{items ? shown.length : "…"}</span>
        </h2>
        <div className="row">
          <label className="toggle">
            <input type="checkbox" checked={swapOnly} onChange={(e) => setSwapOnly(e.target.checked)} /> Open to swap only
          </label>
          <select className="input" style={{ width: 200 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {items && shown.length === 0 && (
        <div className="panel empty">
          <h3>{items.length === 0 ? "Nothing listed yet" : "No matches"}</h3>
          <p>{items.length === 0 ? "Be the first to list something." : "Try another search or clear the filters."}</p>
          <p style={{ marginTop: 16 }}>
            <Link href="/items/new" className="btn btn-primary">List an item</Link>
          </p>
        </div>
      )}
      <div className="grid">
        {shown.map((i) => <ItemCard key={i.id} item={i} />)}
      </div>
    </>
  );
}
