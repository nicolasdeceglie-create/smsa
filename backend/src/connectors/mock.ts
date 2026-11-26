// ============================================================
//  Connettore MOCK (ticket B11) — eventi finti in memoria.
//  Attivo con MOCK=true. Supporta anche le scritture, così la
//  demo funziona end-to-end anche senza Google / senza rete.
// ============================================================
import type { CalendarEvent, EventPatch, NewEvent } from "../../../shared/types.ts";
import { toZonedIso, todayIn, zonedDate } from "../../../shared/time.ts";
import { config } from "../config.ts";
import { readDemoCalendar, toCalendarEvent } from "../../../shared/demoData.ts";

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

/** Offset (giorni da oggi) del giorno n della settimana corrente: 0 = lunedì … 4 = venerdì */
function thisWeek(n: number): number {
  const wd = new Date(`${day(0)}T12:00:00Z`).getUTCDay(); // 0 = domenica
  return n - ((wd + 6) % 7);
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
    ev("mock-ics-calcetto", "Calcetto", 5, "20:00", "21:00", [], { source: "ics", calendar: "iCloud personale", readonly: true }),
    ev("mock-ics-genitori", "Pranzo dai genitori", 9, "13:00", "14:30", [], { source: "ics", calendar: "iCloud personale", readonly: true }),
  );

  // Altri meeting per riempire le settimane. Molti titoli sono gli stessi dello storico in db/src/seed.ts,
  // così predict_meetings ha già valutazioni simili da cui imparare.
  const UX = ["sara.galli@azienda.it", "veronica.monti@azienda.it", "chiara.russo@azienda.it"];
  list.push(
    // settimana scorsa
    ev("mock-1to1-past", "1:1 con Giulia", -7, "16:00", "16:30", [TEAM[0]]),
    ev("mock-retro-1", "Retrospettiva", -6, "16:45", "17:30", TEAM),
    ev("mock-commerciale-1", "Allineamento commerciale", -4, "11:00", "12:30", ["stefano.colombo@azienda.it"]),
    ev("mock-coffee-1", "Caffè con Davide", -2, "10:30", "11:05", [TEAM[1]]),
    // questa settimana e le prossime due
    ev("mock-lunch-cto", "Pranzo con Valeria (CTO)", 0, "12:30", "13:30", ["valeria.marchetti@azienda.it"]),
    ev("mock-codereview", "Code review modulo pagamenti", 1, "16:45", "17:45", [TEAM[1], "ilaria.deluca@azienda.it"]),
    ev("mock-ux", "Workshop UX onboarding", 2, "12:30", "13:45", UX),
    ev("mock-commerciale-2", "Allineamento commerciale", 3, "16:00", "17:30", ["stefano.colombo@azienda.it", "alessandro.conti@azienda.it"]),
    ev("mock-1to1-davide", "1:1 con Davide", 4, "17:30", "18:00", [TEAM[1]]),
    ev("mock-security", "Security review infrastruttura", 6, "10:00", "11:00", ["pietro.messina@azienda.it", "andrea.moretti@azienda.it"]),
    ev("mock-1to1-2", "1:1 con Giulia", 7, "16:00", "16:30", [TEAM[0]]),
    ev("mock-coffee-2", "Caffè con Davide", 8, "10:30", "11:05", [TEAM[1]]),
    ev("mock-retro-2", "Retrospettiva", 9, "16:45", "17:30", TEAM),
    ev("mock-fintech-demo", "Demo cliente FinTech Italia", 10, "14:00", "15:00", ["r.marino@fintechitalia.it", "alessandro.conti@azienda.it"]),
    ev("mock-planning-2", "Sprint planning", 11, "10:00", "12:00", TEAM),
    ev("mock-qa", "Allineamento QA release", 12, "14:00", "14:45", ["caterina.lombardo@azienda.it", "emma.sala@azienda.it"]),
    ev("mock-status-3", "Weekly status report", 13, "15:00", "16:00", TEAM),
    ev("mock-1to1-3", "1:1 con Giulia", 14, "16:00", "16:30", [TEAM[0]]),
  );

  // Settimana corrente più piena (lunedì-venerdì della settimana in cui parte il backend),
  // così la vista settimanale è ricca qualunque sia il giorno della demo.
  list.push(
    // lunedì
    ev("mock-week-kickoff", "Kick-off settimanale", thisWeek(0), "09:45", "10:15", TEAM),
    ev("mock-week-colloquio", "Colloquio candidato backend", thisWeek(0), "14:00", "15:00", ["silvia.fontana@azienda.it"]),
    ev("mock-week-hw", "Allineamento con team Hardware", thisWeek(0), "16:00", "17:00", ["luca.verdi@azienda.it", "serena.testa@azienda.it"]),
    // martedì
    ev("mock-week-mobile", "Review PR app mobile", thisWeek(1), "11:30", "12:30", ["pietro.santoro@azienda.it", "anna.fontana@azienda.it"]),
    ev("mock-week-cloud", "Call fornitore cloud", thisWeek(1), "14:30", "15:30", ["francesco.desantis@azienda.it", "account@cloudprovider.example"]),
    ev("mock-week-1to1-sara", "1:1 con Sara", thisWeek(1), "17:00", "17:30", [TEAM[2]]),
    // mercoledì
    ev("mock-week-devops", "Allineamento DevOps", thisWeek(2), "10:00", "11:00", ["andrea.moretti@azienda.it", "elena.neri@azienda.it"]),
    ev("mock-week-pranzo", "Pranzo di team", thisWeek(2), "12:30", "13:30", TEAM),
    ev("mock-week-demo-int", "Demo interna nuove funzionalità", thisWeek(2), "16:30", "17:30", ["valeria.marchetti@azienda.it", "pietro.santoro@azienda.it"]),
    // giovedì
    ev("mock-week-budget", "Revisione budget Q1", thisWeek(3), "10:00", "11:00", ["stefano.colombo@azienda.it"]),
    ev("mock-week-security", "Workshop sicurezza applicativa", thisWeek(3), "14:00", "15:15", ["pietro.messina@azienda.it", TEAM[1]]),
    ev("mock-week-qa", "Sync QA", thisWeek(3), "17:00", "17:30", ["caterina.lombardo@azienda.it"]),
    // venerdì
    ev("mock-week-stakeholder", "Demo sprint agli stakeholder", thisWeek(4), "14:00", "15:00", ["alessandro.conti@azienda.it", "valeria.marchetti@azienda.it"]),
    ev("mock-week-product", "Weekly sync con Product", thisWeek(4), "15:15", "16:00", ["pietro.santoro@azienda.it"]),
  );
  return list;
}

/** Con MOCK_DATA_FILE gli eventi arrivano dal calendario di esempio del gruppo DB */
function loadEvents(): CalendarEvent[] {
  if (!config.mockDataFile) return initialEvents();
  const cal = readDemoCalendar(config.mockDataFile);
  return cal.events.map((e) => toCalendarEvent(e, cal.calendar_owner));
}

let events: CalendarEvent[] = loadEvents();
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
