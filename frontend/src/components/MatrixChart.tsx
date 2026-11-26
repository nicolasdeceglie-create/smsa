// Scatter rating × effort con i 4 quadranti (F4).
// Versione base in SVG: da rifinire (animazioni, hover più ricco, ecc.).
import type { MeetingSummary } from "../../../shared/types.ts";
import { QUADRANT_LABEL } from "./InsightsPanel.tsx";

const W = 300, H = 220, PAD = 30;
// scala 0.5-5.5 → pixel (margine così i punti a 1 o 5 non toccano i bordi)
const x = (effort: number) => PAD + ((effort - 0.5) / 5) * (W - PAD * 2);
const y = (rating: number) => H - PAD - ((rating - 0.5) / 5) * (H - PAD * 2);

export function MatrixChart({ summary }: { summary: MeetingSummary[] }) {
  const midX = x(3), midY = y(3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="matrix" role="img" aria-label="Matrice rating per effort">
      {/* quadranti */}
      <rect x={PAD} y={PAD} width={midX - PAD} height={midY - PAD} className="q-bg q-keep" />
      <rect x={midX} y={PAD} width={W - PAD - midX} height={midY - PAD} className="q-bg q-optimize" />
      <rect x={PAD} y={midY} width={midX - PAD} height={H - PAD - midY} className="q-bg q-shorten" />
      <rect x={midX} y={midY} width={W - PAD - midX} height={H - PAD - midY} className="q-bg q-drop" />
      <text x={PAD + 4} y={PAD + 12} className="q-label">{QUADRANT_LABEL.keep}</text>
      <text x={W - PAD - 4} y={PAD + 12} className="q-label" textAnchor="end">{QUADRANT_LABEL.optimize}</text>
      <text x={PAD + 4} y={H - PAD - 4} className="q-label">{QUADRANT_LABEL.shorten}</text>
      <text x={W - PAD - 4} y={H - PAD - 4} className="q-label" textAnchor="end">{QUADRANT_LABEL.drop}</text>
      {/* assi */}
      <text x={W / 2} y={H - 6} className="axis" textAnchor="middle">Effort →</text>
      <text x={10} y={H / 2} className="axis" textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`}>Rating →</text>
      {/* punti */}
      {summary.map((s) => (
        <g key={s.title}>
          <circle cx={x(s.avg_effort)} cy={y(s.avg_rating)} r={4 + Math.min(s.count, 6)} className={`pt q-${s.quadrant}`}>
            <title>{`${s.title}: rating ${s.avg_rating}, effort ${s.avg_effort} (${s.count} valutazioni)`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
