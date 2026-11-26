import type { RatingWithEvent } from "../../../shared/types.ts";

function Dots({ value, kind }: { value: number; kind: "rating" | "effort" }) {
  return (
    <span className={`dots dots-${kind}`} aria-label={`${kind} ${value} su 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= value ? "on" : ""} />)}
    </span>
  );
}

export function RatingsPanel({ ratings }: { ratings: RatingWithEvent[] }) {
  if (!ratings.length) return <p className="muted">Nessuna valutazione. Chiedi a Claude "com'è andato il meeting di oggi?"</p>;

  return (
    <ul className="ratings">
      {ratings.slice(0, 8).map((r) => (
        <li key={r.id}>
          <div className="rating-head">
            <strong>{r.event_title}</strong>
            <span className="muted">
              {new Date(r.event_start).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
            </span>
          </div>
          <div className="rating-scores">
            <span>Rating <Dots value={r.rating} kind="rating" /></span>
            <span>Effort <Dots value={r.effort} kind="effort" /></span>
          </div>
          {r.note && <p className="note">“{r.note}”</p>}
        </li>
      ))}
    </ul>
  );
}
