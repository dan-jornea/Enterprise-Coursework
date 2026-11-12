"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Building2, ChevronRight, Flag, Info, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ALLOWED_DOMAINS, BRAND, UNIVERSITY, YEARS } from "@/lib/config";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [f, setF] = useState({ email: "", password: "", name: "", course: "", year: YEARS[0] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [ssoNote, setSsoNote] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const email = f.email.trim().toLowerCase();
    const domain = email.split("@")[1] ?? "";
    if (mode === "signup" && !ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      return setError(`Use your university email address (ending in @${UNIVERSITY.domain}).`);
    }
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: f.password,
        options: { data: { display_name: f.name.trim(), course: f.course.trim(), year: f.year } },
      });
      setBusy(false);
      if (error) {
        return setError(
          error.message.includes("Database error")
            ? `Sign-up is limited to ${UNIVERSITY.name} email addresses.`
            : error.message
        );
      }
      if (data.session) return router.push("/");
      setMsg("Almost done. We've sent a link to your university inbox. Click it to confirm you're a student, then sign in.");
      setMode("signin");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
      setBusy(false);
      if (error) return setError(error.message);
      router.push("/");
    }
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <span className="badge" style={{ alignSelf: "flex-start", background: "rgba(255,255,255,.14)", color: "#fff" }}>
          <ShieldCheck size={14} /> {UNIVERSITY.short} campus network
        </span>
        <div>
          <h1>{mode === "signup" ? `Join ${BRAND}` : `Sign in to ${BRAND}`}</h1>
          <p style={{ marginTop: 10 }}>Peer-to-peer trading for {UNIVERSITY.name} students only.</p>
        </div>
        <div className="promise">
          <span className="ic"><BadgeCheck size={20} /></span>
          <div>
            <b>Verified students only</b>
            <p>Every account needs a confirmed @{UNIVERSITY.domain} email, so there are no anonymous strangers.</p>
          </div>
        </div>
        <div className="promise">
          <span className="ic"><MapPin size={20} /></span>
          <div>
            <b>Safe exchange spots</b>
            <p>Hand items over at busy public places on campus, like the Students' Union or the library foyer.</p>
          </div>
        </div>
        <div className="promise">
          <span className="ic"><Flag size={20} /></span>
          <div>
            <b>Report anything odd</b>
            <p>Every listing has a report button. The team reviews reports and removes problem accounts.</p>
          </div>
        </div>
      </aside>

      <section className="auth-main">
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>Create account</button>
          <button className={mode === "signin" ? "on" : ""} onClick={() => setMode("signin")}>Sign in</button>
        </div>

        <button type="button" className="sso" onClick={() => setSsoNote(true)}>
          <Building2 size={22} />
          <span style={{ flex: 1 }}>
            <b>Continue with {UNIVERSITY.name} SSO</b>
            <small>Use your university login</small>
          </span>
          <ChevronRight size={18} />
        </button>
        {ssoNote && (
          <div className="notice">
            <Info size={16} />
            <span>University single sign-on needs the university's approval, so it isn't connected in this demo. Use your university email below.</span>
          </div>
        )}

        <div className="divider">or use your university email</div>

        <form className="stack" onSubmit={submit}>
          {mode === "signup" && (
            <div className="two">
              <label className="field">
                <span>Your name</span>
                <input className="input" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Maya Chen" />
              </label>
              <label className="field">
                <span>Year</span>
                <select className="input" value={f.year} onChange={(e) => set("year", e.target.value)}>
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </label>
            </div>
          )}
          {mode === "signup" && (
            <label className="field">
              <span>Course <span className="hint">(shown on your listings)</span></span>
              <input className="input" value={f.course} onChange={(e) => set("course", e.target.value)} placeholder="e.g. Computer Science" />
            </label>
          )}
          <label className="field">
            <span>University email</span>
            <input className="input" type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} placeholder={`ab123@${UNIVERSITY.domain}`} />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" required minLength={8} value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" />
          </label>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : `Sign in to ${BRAND}`}
          </button>
          {error && <p className="error">{error}</p>}
          {msg && (
            <div className="notice green">
              <BadgeCheck size={16} />
              <span>{msg}</span>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
