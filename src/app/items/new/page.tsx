"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Clock, ImagePlus, Info, PoundSterling, Tag, X } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { CATEGORIES, CONDITIONS, LOCATIONS, TIME_WINDOWS, type CategoryId, type ConditionId } from "@/lib/config";
import { supabase, toPence, type Item } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";

const MAX_PHOTO_MB = 5;

export default function NewItem() {
  const router = useRouter();
  const { user, profile } = useAuth(true);
  const [f, setF] = useState({
    title: "",
    description: "",
    category: "furniture" as CategoryId,
    condition: "good" as ConditionId,
    price: "",
    original: "",
    open_to_trade: true,
    location: LOCATIONS[0],
    pickup_window: "afternoon",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    if (!chosen) return;
    if (!chosen.type.startsWith("image/")) return setError("Please choose an image file.");
    if (chosen.size > MAX_PHOTO_MB * 1024 * 1024) return setError(`Photos must be under ${MAX_PHOTO_MB} MB.`);
    setError("");
    setFile(chosen);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    const price_pence = f.price.trim() === "" ? null : toPence(f.price);
    const original_price_pence = f.original.trim() === "" ? null : toPence(f.original);
    if (price_pence === null && !f.open_to_trade) return setError("Set a price, allow swaps, or both.");

    setBusy(true);
    let photo_url: string | null = null;
    if (file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("item-photos").upload(path, file, { contentType: file.type });
      if (upErr) {
        setBusy(false);
        return setError(`Photo upload failed: ${upErr.message}`);
      }
      photo_url = supabase.storage.from("item-photos").getPublicUrl(path).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("items")
      .insert({
        owner_id: user.id,
        title: f.title.trim(),
        description: f.description.trim() || null,
        category: f.category,
        condition: f.condition,
        price_pence,
        original_price_pence,
        open_to_trade: f.open_to_trade,
        location: f.location,
        pickup_window: f.pickup_window,
        photo_url,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/items/${data.id}`);
  }

  const previewItem: Item = {
    id: "preview",
    owner_id: user?.id ?? "",
    title: f.title,
    description: f.description,
    category: f.category,
    condition: f.condition,
    price_pence: f.price.trim() === "" ? null : toPence(f.price),
    original_price_pence: f.original.trim() === "" ? null : toPence(f.original),
    open_to_trade: f.open_to_trade,
    status: "available",
    location: f.location,
    photo_url: preview,
    pickup_window: f.pickup_window,
    created_at: new Date().toISOString(),
    seller: profile,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>List an item</h1>
          <p>Sell it, swap it, or both. Only verified students at your university will see it.</p>
        </div>
      </div>

      <form className="split" onSubmit={submit}>
        <div className="stack">
          <section className="panel">
            <div className="section-label"><Camera size={18} /> Photo</div>
            <label className="dropzone">
              <input type="file" accept="image/*" hidden onChange={pickFile} />
              {preview ? (
                <>
                  <img src={preview} alt="Selected photo" />
                  <button type="button" className="icon-btn remove" onClick={(e) => { e.preventDefault(); setFile(null); }} aria-label="Remove photo">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <ImagePlus size={30} />
                  <b>Add a photo</b>
                  <span className="small">JPG or PNG, up to {MAX_PHOTO_MB} MB</span>
                </>
              )}
            </label>
            <div className="notice" style={{ marginTop: 12 }}>
              <Info size={16} />
              <span>Move-out tip: photograph the real item and any labels or plugs. Honest photos get fewer questions.</span>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-label" style={{ marginBottom: 0 }}><Tag size={18} /> Details</div>
            <label className="field">
              <span>Title</span>
              <input className="input" required maxLength={80} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Mesh desk chair, fits under most desks" />
            </label>
            <div className="field">
              <span className="field-label">Category</span>
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <button type="button" key={c.id} className={`chip ${f.category === c.id ? "on" : ""}`} onClick={() => set("category", c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label">Condition</span>
              <div className="opt-grid">
                {CONDITIONS.map((c) => (
                  <button type="button" key={c.id} className={`opt ${f.condition === c.id ? "on" : ""}`} onClick={() => set("condition", c.id)}>
                    <b>{c.label}</b>
                    <small>{c.hint}</small>
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Description <span className="hint">{f.description.length}/500</span></span>
              <textarea className="input" rows={4} maxLength={500} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Condition, size, why you're selling, any quirks. Mention if you can help carry it." />
            </label>
          </section>

          <section className="panel stack">
            <div className="section-label" style={{ marginBottom: 0 }}><Clock size={18} /> Pickup</div>
            <label className="field">
              <span>Where is it?</span>
              <select className="input" value={f.location} onChange={(e) => set("location", e.target.value)}>
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <div className="field">
              <span className="field-label">Best time to hand over</span>
              <div className="three">
                {TIME_WINDOWS.map((w) => (
                  <button type="button" key={w.id} className={`opt ${f.pickup_window === w.id ? "on" : ""}`} onClick={() => set("pickup_window", w.id)}>
                    <b>{w.label}</b>
                    <small>{w.time}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="section-label" style={{ marginBottom: 0 }}><PoundSterling size={18} /> Price and swaps</div>
            <div className="two">
              <label className="field">
                <span>Your price <span className="hint">(leave empty for swap only)</span></span>
                <div className="input-prefix"><b>£</b><input className="input" type="number" min="0" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="28" /></div>
              </label>
              <label className="field">
                <span>Price new <span className="hint">(estimate, optional)</span></span>
                <div className="input-prefix"><b>£</b><input className="input" type="number" min="0" step="0.01" value={f.original} onChange={(e) => set("original", e.target.value)} placeholder="95" /></div>
              </label>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={f.open_to_trade} onChange={(e) => set("open_to_trade", e.target.checked)} />
              Open to swaps. Other students can offer one of their items, with or without cash on top.
            </label>
          </section>
        </div>

        <aside className="sticky stack">
          <div className="panel stack">
            <h3>Preview</h3>
            <ItemCard item={previewItem} preview />
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
              {busy ? "Publishing…" : "Publish listing"}
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        </aside>
      </form>
    </>
  );
}
