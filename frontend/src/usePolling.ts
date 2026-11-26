import { useEffect, useRef, useState } from "react";

/** Richiama fetcher ogni intervalMs (default 3s): così le modifiche fatte da Claude compaiono live. */
export function usePolling<T>(fetcher: () => Promise<T>, deps: unknown[] = [], intervalMs = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const d = await fetcherRef.current();
        if (!alive) return;
        setData(d);
        setError(null);
        setUpdatedAt(new Date());
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, updatedAt };
}
