// Client verso il backend (passa dal proxy di Vite: /api → http://localhost:3001)
import type { CalendarEvent, MeetingSummary, RatingWithEvent } from "../../shared/types.ts";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`Errore ${res.status} su ${path}`);
  return res.json();
}

export const api = {
  health: () => get<{ ok: boolean; mock: boolean; timezone: string }>("/health"),
  events: (from: string, to: string) =>
    get<CalendarEvent[]>(`/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  ratings: () => get<RatingWithEvent[]>("/ratings"),
  summary: () => get<MeetingSummary[]>("/ratings/summary"),
};
