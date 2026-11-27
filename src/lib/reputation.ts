"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// A student's standing. The database works it out from completed trades and reports
// (see supabase/004_ratings.sql). `rating` is null until there is something to go on.
export type Reputation = { rating: number | null; trades: number; sales: number };

export const NEW_MEMBER: Reputation = { rating: null, trades: 0, sales: 0 };

type Row = { user_id: string; rating: number; trades_count: number; sales_count: number };
type Found = Record<string, Reputation>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHUNK = 100;
const NOBODY: Found = {};

// Ratings for a set of students, keyed by user id. The result is:
//  - undefined while loading,
//  - null when ratings aren't available (004_ratings.sql hasn't been run on this database),
//  - otherwise a lookup. Students with no history yet are simply not in it.
// Pass `refresh` (any value that changes) to load again after something has happened.
export function useReputations(userIds: Array<string | null | undefined>, refresh?: unknown) {
  const key = [...new Set(userIds.filter((id): id is string => !!id && UUID.test(id)))].sort().join(",");
  // Remembers which students the result is for, so a result for one set is never shown for another.
  const [loaded, setLoaded] = useState<{ key: string; found: Found | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let active = true;
    const setFound = (found: Found | null) => setLoaded({ key, found });
    const ids = key.split(",");
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

    Promise.all(
      chunks.map((chunk) =>
        supabase.from("user_reputation").select("user_id, rating, trades_count, sales_count").in("user_id", chunk)
      )
    ).then((results) => {
      if (!active) return;
      if (results.some((result) => result.error)) return setFound(null);
      const next: Found = {};
      for (const result of results) {
        for (const row of (result.data as Row[] | null) ?? []) {
          next[row.user_id] = { rating: Number(row.rating), trades: row.trades_count, sales: row.sales_count };
        }
      }
      setFound(next);
    });
    return () => {
      active = false;
    };
  }, [key, refresh]);

  if (!key) return NOBODY;
  return loaded?.key === key ? loaded.found : undefined;
}

// What to show for one student: their rating, "new member", or nothing (null) while ratings
// are loading or unavailable.
export function reputationOf(found: Found | null | undefined, userId: string | null | undefined): Reputation | null {
  if (!found || !userId) return null;
  return found[userId] ?? NEW_MEMBER;
}
