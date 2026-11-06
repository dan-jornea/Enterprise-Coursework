"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <nav>
      <Link href="/"><strong>Uni Marketplace</strong></Link>
      <span className="spacer" />
      {email ? (
        <>
          <Link href="/items/new">Sell / trade</Link>
          <Link href="/offers">Offers</Link>
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </>
      ) : (
        <Link href="/login">Sign in</Link>
      )}
    </nav>
  );
}
