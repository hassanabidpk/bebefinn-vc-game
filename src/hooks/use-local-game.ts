"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Save the decision synchronously before its animation; do not depend on an effect to persist it. */
export function useLocalGame<T>(key: string, parse: (raw: string | null) => T) {
  const [state, setState] = useState<T | null>(null);
  const current = useRef<T | null>(null);
  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(key); } catch { /* private browsing */ }
    current.current = parse(raw);
    // Preserve the active puzzle even if the child leaves before their first tap.
    // This also repairs a malformed payload with its validated initial state.
    try { localStorage.setItem(key, JSON.stringify(current.current)); } catch { /* play in memory */ }
    setState(current.current);
  }, [key, parse]);
  const update = useCallback((change: (previous: T) => T) => {
    if (!current.current) return;
    const next = change(current.current);
    if (next === current.current) return;
    current.current = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* play in memory */ }
    setState(next);
  }, [key]);
  return { state, update };
}
