"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, LogOut, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { BRAND, UNIVERSITY } from "@/lib/config";
import Avatar from "./Avatar";

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/offers", label: "Offers" },
  { href: "/storage", label: "Storage & collection" },
  { href: "/me", label: "My listings" },
];

export default function NavBar() {
  const { user, profile, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <ArrowLeftRight size={18} strokeWidth={2.4} />
          </span>
          <span>
            <strong>{BRAND}</strong>
            <small>{UNIVERSITY.name}</small>
          </span>
        </Link>

        {user && (
          <nav className="nav-links">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="nav-right">
          {!loading && user && (
            <>
              <Link href="/items/new" className="btn btn-primary">
                <Plus size={16} /> Sell or swap
              </Link>
              <Link href="/me" className="nav-user" title={user.email ?? ""}>
                <Avatar name={profile?.display_name ?? user.email} size={34} />
              </Link>
              <button className="icon-btn" onClick={signOut} title="Sign out" aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
