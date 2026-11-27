"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { CATEGORIES, LOCATIONS } from "@/lib/config";
import { reputationOf, useReputations } from "@/lib/reputation";
import { ITEM_SELECT, supabase, type Item } from "@/lib/supabase";
import { SAMPLE_ITEMS, SAMPLE_REPUTATIONS } from "@/lib/sample";
import { useAuth } from "@/lib/useAuth";

type SortOrder = "newest" | "price-low" | "price-high";

export default function Home() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");

  useEffect(() => {
    let active = true;

    async function loadItems() {
      setItems(null);
      setError("");
      const { data, error } = await supabase
        .from("items")
        .select(ITEM_SELECT)
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        setError(error.message);
        setItems([]);
        return;
      }
      setItems((data as unknown as Item[]) ?? []);
    }

    if (user) void loadItems();
    else setItems([]);

    return () => {
      active = false;
    };
  }, [user]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minValue = Number(minPrice);
    const maxValue = Number(maxPrice);
    const minPence = minPrice.trim() !== "" && Number.isFinite(minValue) && minValue >= 0
      ? Math.round(minValue * 100)
      : null;
    const maxPence = maxPrice.trim() !== "" && Number.isFinite(maxValue) && maxValue >= 0
      ? Math.round(maxValue * 100)
      : null;
    return (items ?? [])
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => location === "all" || item.location === location)
      .filter((item) => {
        if (minPence === null && maxPence === null) return true;
        if (item.price_pence === null) return false;
        if (minPence !== null && item.price_pence < minPence) return false;
        if (maxPence !== null && item.price_pence > maxPence) return false;
        return true;
      })
      .filter((item) => !query || `${item.title} ${item.description ?? ""}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === "price-low") return (a.price_pence ?? Infinity) - (b.price_pence ?? Infinity);
        if (sort === "price-high") return (b.price_pence ?? -Infinity) - (a.price_pence ?? -Infinity);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [items, search, category, location, minPrice, maxPrice, sort]);

  const reputations = useReputations((items ?? []).map((item) => item.owner_id));

  if (loading) return null;

  if (!user) {
    return (
      <>
        <section className="hero">
          <div>
            <span className="badge">The student marketplace for Bath</span>
            <h1>Good finds.<br /><em>Better swaps.</em></h1>
            <p className="lead">Buy, sell and swap the things you need with verified University of Bath students.</p>
            <Link href="/login" className="btn btn-primary btn-lg">
              Join the campus marketplace <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-cards">
            {SAMPLE_ITEMS.map((item) => <ItemCard key={item.id} item={item} preview reputation={SAMPLE_REPUTATIONS[item.id]} />)}
          </div>
        </section>
        <section className="features">
          <div className="panel feature"><h3>Made for campus</h3><p>Find useful things nearby and arrange handovers around campus.</p></div>
          <div className="panel feature"><h3>Buy or swap</h3><p>Make an offer with cash, one of your items, or both.</p></div>
          <div className="panel feature"><h3>Student community</h3><p>Listings are shared within the verified university community.</p></div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Explore listings</h1>
          <p>Buy, sell and swap with University of Bath students.</p>
        </div>
        <Link href="/items/new" className="btn btn-primary">List an item <ArrowRight size={16} /></Link>
      </div>

      <label className="search">
        <Search size={19} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items..." aria-label="Search items" />
      </label>

      <div className="filters">
        <div className="filter-row">
          <span className="filter-label">Category</span>
          <div className="chips">
            <button type="button" className={`chip ${category === "all" ? "on" : ""}`} onClick={() => setCategory("all")}>All items</button>
            {CATEGORIES.map((entry) => (
              <button type="button" key={entry.id} className={`chip ${category === entry.id ? "on" : ""}`} onClick={() => setCategory(entry.id)}>
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-label">Location</span>
          <label className="row" style={{ maxWidth: 320, flex: 1 }}>
            <MapPin size={16} className="muted" />
            <select className="input" value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by location">
              <option value="all">All locations</option>
              {LOCATIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </label>
        </div>
        <div className="filter-row">
          <span className="filter-label">Price</span>
          <div className="row">
            <label className="row" style={{ gap: 6 }}>
              <span className="small muted">Minimum</span>
              <div className="input-prefix" style={{ width: 110 }}>
                <b>£</b>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="0"
                  aria-label="Minimum price"
                />
              </div>
            </label>
            <span className="muted">–</span>
            <label className="row" style={{ gap: 6 }}>
              <span className="small muted">Maximum</span>
              <div className="input-prefix" style={{ width: 110 }}>
                <b>£</b>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="Any"
                  aria-label="Maximum price"
                />
              </div>
            </label>
            {(minPrice !== "" || maxPrice !== "") && (
              <button type="button" className="link-btn" onClick={() => { setMinPrice(""); setMaxPrice(""); }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <h2>{items === null ? "Loading listings..." : `${visibleItems.length} listing${visibleItems.length === 1 ? "" : "s"}`}</h2>
        <label className="row">
          <span className="muted small">Sort by</span>
          <select className="input" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} aria-label="Sort listings">
            <option value="newest">Newest first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </div>

      {error && <div className="panel notice amber" role="alert"><span><b>Could not load listings.</b> {error}</span></div>}
      {!error && items !== null && visibleItems.length === 0 && (
        <div className="panel empty">
          <h3>No listings found</h3>
          <p>{items.length === 0 ? "There are no available listings yet. Check back soon or add the first one." : "Try changing your search or filters."}</p>
        </div>
      )}
      {!error && visibleItems.length > 0 && (
        <div className="grid">
          {visibleItems.map((item) => <ItemCard key={item.id} item={item} reputation={reputationOf(reputations, item.owner_id)} />)}
        </div>
      )}
    </>
  );
}
