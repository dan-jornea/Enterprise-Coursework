"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return setError(error.message);
      setMsg("Check your university inbox and click the confirmation link, then sign in.");
      setMode("signin");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setError(error.message);
      router.push("/");
    }
  }

  return (
    <>
      <h1>{mode === "signup" ? "Join with your university email" : "Sign in"}</h1>
      <form onSubmit={submit}>
        <label>University email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@bath.ac.uk" />
        </label>
        <label>Password
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit">{mode === "signup" ? "Create account" : "Sign in"}</button>
        {error && <p className="error">{error}</p>}
        {msg && <p>{msg}</p>}
      </form>
      <p className="muted">
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === "signup" ? "signin" : "signup"); }}>
          {mode === "signup" ? "Sign in" : "Create account"}
        </a>
      </p>
    </>
  );
}
