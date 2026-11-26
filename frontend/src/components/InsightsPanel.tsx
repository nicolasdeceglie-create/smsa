import type { MeetingSummary, Quadrant } from "../../../shared/types.ts";

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  keep: "Da tenere",
  optimize: "Da ottimizzare",
  shorten: "Da accorciare",
  drop: "Da eliminare",
};

export function InsightsPanel({ summary }: { summary: MeetingSummary[] }) {
  if (!summary.length) return <p className="muted">Ancora nessun dato.</p>;

  return (
    <table className="insights">
      <thead>
        <tr><th>Meeting</th><th>Rating</th><th>Effort</th><th /></tr>
      </thead>
      <tbody>
        {summary.map((s) => (
          <tr key={s.title}>
            <td>{s.title} <span className="muted">×{s.count}</span></td>
            <td className="num">{s.avg_rating.toFixed(1)}</td>
            <td className="num">{s.avg_effort.toFixed(1)}</td>
            <td><span className={`badge q-${s.quadrant}`}>{QUADRANT_LABEL[s.quadrant]}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
