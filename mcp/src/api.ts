// ============================================================
//  Client HTTP verso il backend SMSA.
//  ⚠️ Server MCP in stdio: MAI console.log (stdout è del protocollo).
//     Per i log usare solo console.error.
// ============================================================
import type {
  CalendarEvent, EventPatch, FreeSlot, MeetingSummary, NewEvent, NewRating, Rating, RatingWithEvent,
} from "../../shared/types.ts";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Backend SMSA non raggiungibile su ${BASE}. È avviato? (cd backend && npm run dev)`);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Errore backend ${res.status}`);
  return data as T;
}

export const api = {
  health: () => call<{ ok: boolean; mock: boolean; timezone: string; now: string }>("GET", "/health"),
  listEvents: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return call<CalendarEvent[]>("GET", `/events?${q}`);
  },
  createEvent: (e: NewEvent) => call<CalendarEvent>("POST", "/events", e),
  updateEvent: (id: string, p: EventPatch) => call<CalendarEvent>("PATCH", `/events/${encodeURIComponent(id)}`, p),
  deleteEvent: (id: string) => call<void>("DELETE", `/events/${encodeURIComponent(id)}`),
  freeSlots: (date: string, duration: number) =>
    call<FreeSlot[]>("GET", `/free-slots?date=${encodeURIComponent(date)}&duration=${duration}`),
  rate: (r: NewRating) => call<Rating>("POST", "/ratings", r),
  ratings: () => call<RatingWithEvent[]>("GET", "/ratings"),
  summary: () => call<MeetingSummary[]>("GET", "/ratings/summary"),
};
