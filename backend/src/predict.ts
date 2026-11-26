// ============================================================
//  Punteggio previsto per i meeting non ancora valutati.
//  Impara dai voti dell'utente: ogni nuovo rating cambia subito le previsioni.
//
//  Come: se l'utente ha già valutato meeting con lo stesso titolo (i ricorrenti)
//  si usa la loro media; altrimenti quella dei meeting con parole del titolo
//  in comune, pesati per quante. In entrambi i casi si parte dalla media
//  generale dell'utente. Poi due regole della traccia:
//  direzione / cliente chiave → utilità alta; troppi del team già invitati → scende.
// ============================================================
import { quadrantOf, type CalendarEvent, type MeetingPrediction, type RatingWithEvent } from "../../shared/types.ts";
import { keyStakeholder, myTeam } from "./org.ts";

/** Peso della media generale: con pochi meeting simili la previsione resta prudente. */
const PRIOR = 1;

const STOP = new Set(["di", "da", "in", "con", "per", "su", "del", "della", "dei", "al", "il", "la", "le", "lo", "gli", "un", "una"]);
export const words = (text: string) =>
  new Set(text.toLowerCase().split(/[^a-z0-9àèéìòù]+/).filter((w) => w.length >= 2 && !STOP.has(w)));
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const round = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.min(5, Math.max(1, n));

export function predict(event: CalendarEvent, ratings: RatingWithEvent[]): MeetingPrediction {
  const baseRating = ratings.length ? avg(ratings.map((r) => r.rating)) : 3;
  const baseEffort = ratings.length ? avg(ratings.map((r) => r.effort)) : 3;
  const eventWords = words(event.title);
  const sameTitle = ratings.filter((r) => r.event_title.toLowerCase() === event.title.toLowerCase());
  const pool = sameTitle.length
    ? sameTitle.map((r) => ({ r, s: 1 }))
    : ratings
        .map((r) => {
          const pastWords = words(r.event_title);
          return { r, s: [...eventWords].filter((w) => pastWords.has(w)).length / Math.max(1, eventWords.size) };
        })
        .filter((x) => x.s > 0);

  let weight = PRIOR, sumRating = PRIOR * baseRating, sumEffort = PRIOR * baseEffort;
  const similar = new Map<string, number>(); // titolo → somiglianza totale
  for (const { r, s } of pool) {
    weight += s;
    sumRating += s * r.rating;
    sumEffort += s * r.effort;
    similar.set(r.event_title, (similar.get(r.event_title) ?? 0) + s);
  }

  let rating = sumRating / weight;
  const effort = sumEffort / weight;
  const reasons = [...similar]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([title]) => {
      const rs = ratings.filter((r) => r.event_title === title);
      const label = title === event.title ? "stesso meeting già valutato" : `simile a "${title}"`;
      return `${label} (${rs.length} ${rs.length === 1 ? "voto" : "voti"}: utilità ${round(avg(rs.map((r) => r.rating)))}, effort ${round(avg(rs.map((r) => r.effort)))})`;
    });
  if (!reasons.length) reasons.push("nessun meeting simile già valutato: uso la media generale dell'utente");

  const vip = event.attendees.map(keyStakeholder).filter((x): x is string => x !== null);
  if (vip.length) {
    rating = Math.max(rating, 4);
    reasons.push(`partecipa ${vip.join(", ")}`);
  }
  const team = new Set(myTeam().map((e) => e.email));
  const fromTeam = event.attendees.filter((a) => team.has(a)).length;
  if (fromTeam >= 2) {
    rating -= 0.5;
    reasons.push(`ci sono già ${fromTeam} persone del tuo team`);
  }

  const evidence = weight - PRIOR;
  const p = { rating: round(clamp(rating)), effort: round(clamp(effort)) };
  return {
    event_id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    ...p,
    quadrant: quadrantOf(p.rating, p.effort),
    confidence: evidence >= 3 ? "alta" : evidence >= 1 ? "media" : "bassa",
    reasons,
  };
}
