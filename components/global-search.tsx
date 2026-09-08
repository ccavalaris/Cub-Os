"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchAction, type SearchHit } from "@/app/(app)/search-actions";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced so a fast typist doesn't fire a query per keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits(null);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          setHits(await searchAction(q));
        } catch {
          setHits([]);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setHits(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="search-bar" ref={boxRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search members, inventory, tee sheet, caddies…"
        autoComplete="off"
      />
      {hits !== null ? (
        <div className="search-results show">
          {hits.length === 0 ? (
            <div className="search-empty">No matches for &ldquo;{query}&rdquo;</div>
          ) : (
            hits.map((h, i) => (
              <div
                key={`${h.href}-${i}`}
                className="search-result-row"
                onClick={() => {
                  setQuery("");
                  setHits(null);
                  router.push(h.href);
                }}
              >
                <span>{h.label}</span>
                <span className="search-result-cat">{h.cat}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
