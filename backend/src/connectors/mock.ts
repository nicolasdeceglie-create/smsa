// ============================================================
//  Connettore MOCK (ticket B11) — eventi finti in memoria.
//  Attivo con MOCK=true. Supporta anche le scritture, così la
//  demo funziona end-to-end anche senza Google / senza rete.
// ============================================================
import type { CalendarEvent, EventPatch, NewEvent } from "../../../shared/types.ts";
import { toZonedIso, todayIn, zonedDate } from "../../../shared/time.ts";
import { config } from "../config.ts";

// Persone dell'organigramma (backend/data/organigramma.json); l'utente è marco.rossi@azienda.it
const TEAM = ["giulia.bianchi@azienda.it", "davide.ferrari@azienda.it", "sara.galli@azienda.it"];

/** Giorno a partire da oggi (offset in giorni) in formato YYYY-MM-DD */
function day(offset: number): string {
  const d = new Date(`${todayIn(config.timezone)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function isWeekend(offset: number): boolean {
  const wd = new Date(`${day(offset)}T12:00:00Z`).getUTCDay();
  return wd === 0 || wd === 6;
}

/** Se l'offset cade nel weekend, lo sposta al lunedì successivo */
function workday(offset: number): number {
  while (isWeekend(offset)) offset++;
  return offset;
}

function ev(id: string, title: string, dayOffset: number, from: string, to: string,
            attendees: string[], extra: Partial<CalendarEvent> = {}): CalendarEvent {
  const tz = config.timezone;
  // Gli eventi di lavoro non cadono nel weekend (quelli personali sì)
  if (!extra.readonly) dayOffset = workday(dayOffset);
  return {
    id, title,
    start: toZonedIso(zonedDate(day(dayOffset), from, tz), tz),
    end: toZonedIso(zonedDate(day(dayOffset), to, tz), tz),
    attendees, source: "google", calendar: "Lavoro", readonly: false,
    ...extra,
  };
}

function initialEvents(): CalendarEvent[] {
  const list: CalendarEvent[] = [];
  // Daily standup nei giorni feriali da -7 a +14
  for (let i = -7; i <= 14; i++) {
    if (!isWeekend(i)) list.push(ev(`mock-daily-${i}`, "Daily standup", i, "09:00", "09:30", TEAM));
  }
  list.push(
    ev("mock-status-1", "Weekly status report", -1, "15:00", "16:00", TEAM),
    ev("mock-status-2", "Weekly status report", 6, "15:00", "16:00", TEAM),
    ev("mock-1to1", "1:1 con Giulia", 0, "16:00", "16:30", [TEAM[0]]),
    ev("mock-planning", "Sprint planning", 1, "10:00", "12:00", TEAM),
    ev("mock-review", "Review architettura", 2, "14:00", "15:00", TEAM),
    ev("mock-fintech", "Call con cliente FinTech Italia", 3, "11:00", "12:00", ["r.marino@fintechitalia.it"]),
    // Inviti nuovi, mai valutati: servono per previsione e delega
    ev("mock-deepdive", "Deep-dive architettura API e integrazione DB", 5, "14:00", "15:00", ["davide.ferrari@azienda.it", "luca.verdi@azienda.it"]),
    ev("mock-onboarding", "Raccolta feedback funzionalità onboarding", 7, "14:30", "15:15", ["chiara.russo@azienda.it"]),
    ev("mock-roadmap", "Review roadmap Q1", 8, "15:00", "16:00", ["alessandro.conti@azienda.it", "sara.galli@azienda.it"]),
    // Eventi "iCloud" in sola lettura, per mostrare il multi-calendario
    ev("mock-ics-gym", "Palestra", 0, "19:00", "20:00", [], { source: "ics", calendar: "iCloud personale", readonly: true }),
    ev("mock-ics-dentist", "Dentista", 2, "08:00", "08:45", [], { source: "ics", calendar: "iCloud personale", readonly: true }),
    ev("mock-ics-dinner", "Cena con amici", 4, "20:30", "22:30", [], { source: "ics", calendar: "iCloud personale", readonly: true }),
  );
  return list;
}

let events: CalendarEvent[] = initialEvents();
let counter = 0;

export const mockConnector = {
  async list(from: Date, to: Date): Promise<CalendarEvent[]> {
    return events.filter((e) => new Date(e.end) > from && new Date(e.start) < to);
  },

  async get(id: string): Promise<CalendarEvent | undefined> {
    return events.find((e) => e.id === id);
  },

  async create(input: NewEvent): Promise<CalendarEvent> {
    const e: CalendarEvent = {
      id: `mock-new-${++counter}`,
      title: input.title,
      start: input.start,
      end: input.end,
      attendees: input.attendees ?? [],
      source: "google",
      calendar: "Lavoro",
      readonly: false,
    };
    events.push(e);
    return e;
  },

  async update(id: string, patch: EventPatch): Promise<CalendarEvent> {
    const e = events.find((x) => x.id === id);
    if (!e) throw new Error(`Evento ${id} non trovato`);
    Object.assign(e, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return e;
  },

  async remove(id: string): Promise<void> {
    events = events.filter((e) => e.id !== id);
  },
};
