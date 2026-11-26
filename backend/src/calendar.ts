// ============================================================
//  Facciata unica sui calendari: le route usano SOLO questo file.
//  Sceglie mock oppure Google + ICS in base a MOCK nel .env.
// ============================================================
import type { CalendarEvent, EventPatch, NewEvent } from "../../shared/types.ts";
import { config, HttpError } from "./config.ts";
import { mockConnector } from "./connectors/mock.ts";
import { googleConnector } from "./connectors/google.ts";
import { icsConnector } from "./connectors/ics.ts";

const writable = config.mock ? mockConnector : googleConnector;

// ---------- B10: cache in memoria per non finire nel rate limit di Google ----------
// La UI fa polling ogni 3 secondi: senza cache ogni refresh = una chiamata a Google.
const CACHE_TTL_MS = 30_000;
let cache: { key: string; at: number; data: CalendarEvent[] } | null = null;
function invalidate() { cache = null; }

export async function listEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
  const key = `${from.toISOString()}|${to.toISOString()}`;
  if (!config.mock && cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const sources = config.mock
    ? [mockConnector.list(from, to)]
    : [googleConnector.list(from, to), icsConnector.list(from, to)];

  // Se un calendario fallisce, mostriamo comunque gli altri
  const results = await Promise.allSettled(sources);
  const events = results.flatMap((r) => {
    if (r.status === "rejected") { console.error("Errore calendario:", r.reason); return []; }
    return r.value;
  });
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  cache = { key, at: Date.now(), data: events };
  return events;
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  const e = await writable.get(id);
  if (e) return e;
  // Potrebbe essere un evento ICS: lo cerchiamo in un intervallo ampio
  const now = Date.now();
  const all = await listEvents(new Date(now - 60 * 86400_000), new Date(now + 60 * 86400_000));
  const found = all.find((x) => x.id === id);
  if (!found) throw new HttpError(404, `Evento "${id}" non trovato. Usa list_events per ottenere l'id corretto.`);
  return found;
}

async function assertWritable(id: string): Promise<void> {
  const e = await getEvent(id);
  if (e.readonly) {
    throw new HttpError(403, `"${e.title}" è nel calendario "${e.calendar}", che è in sola lettura: non può essere modificato.`);
  }
}

export async function createEvent(input: NewEvent): Promise<CalendarEvent> {
  const e = await writable.create(input);
  invalidate();
  return e;
}

export async function updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent> {
  await assertWritable(id);
  const e = await writable.update(id, patch);
  invalidate();
  return e;
}

export async function deleteEvent(id: string): Promise<void> {
  await assertWritable(id);
  await writable.remove(id);
  invalidate();
}
