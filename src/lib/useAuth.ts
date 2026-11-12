"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase, type Profile } from "./supabase";

type AuthState = { loading: boolean; user: User | null; profile: Profile | null };

// Current user + profile. Pass `required` to send signed-out visitors to /login.
export function useAuth(required = false) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ loading: true, user: null, profile: null });

  useEffect(() => {
    let active = true;

    async function load(user: User | null) {
      if (!user) {
        if (active) setState({ loading: false, user: null, profile: null });
        if (required) router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, course, year")
        .eq("id", user.id)
        .maybeSingle();
      if (active) setState({ loading: false, user, profile: (data as Profile | null) ?? null });
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer: Supabase advises against awaiting queries inside this callback.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => load(session?.user ?? null), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [required, router]);

  return state;
}
