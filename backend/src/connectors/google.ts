// ============================================================
//  Connettore Google Calendar — ticket B3 (lettura) e B4 (scrittura)
//  BOZZA: il codice è già scritto ma va TESTATO con credenziali vere.
//  Prerequisito: ticket B2 (npm run auth → token.json).
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { google, type calendar_v3 } from "googleapis";
import type { CalendarEvent, EventPatch, NewEvent } from "../../../shared/types.ts";
import { config, HttpError } from "../config.ts";

let client: calendar_v3.Calendar | null = null;

function calendar(): calendar_v3.Calendar {
  if (client) return client;
  const raw = JSON.parse(readFileSync(config.google.credentialsPath, "utf8"));
  const { client_id, client_secret } = raw.installed ?? raw.web;
  const auth = new google.auth.OAuth2(client_id, client_secret);
  auth.setCredentials(JSON.parse(readFileSync(config.google.tokenPath, "utf8")));
  // Salva i token rinnovati automaticamente
  auth.on("tokens", (t) => {
    const old = JSON.parse(readFileSync(config.google.tokenPath, "utf8"));
    writeFileSync(config.google.tokenPath, JSON.stringify({ ...old, ...t }, null, 2));
  });
  client = google.calendar({ version: "v3", auth });
  return client;
}

/** Evento Google → formato condiviso */
function normalize(e: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: e.id!,
    title: e.summary ?? "(senza titolo)",
    // Gli eventi "tutto il giorno" hanno solo date, non dateTime
    start: e.start?.dateTime ?? `${e.start?.date}T00:00:00`,
    end: e.end?.dateTime ?? `${e.end?.date}T00:00:00`,
    attendees: (e.attendees ?? []).map((a) => a.email!).filter(Boolean),
    source: "google",
    calendar: "Google",
    readonly: false,
  };
}

function toGoogle(input: EventPatch): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = {};
  if (input.title !== undefined) body.summary = input.title;
  if (input.start !== undefined) body.start = { dateTime: input.start, timeZone: config.timezone };
  if (input.end !== undefined) body.end = { dateTime: input.end, timeZone: config.timezone };
  if (input.attendees !== undefined) body.attendees = input.attendees.map((email) => ({ email }));
  return body;
}

export const googleConnector = {
  // ---------- B3: lettura ----------
  async list(from: Date, to: Date): Promise<CalendarEvent[]> {
    const res = await calendar().events.list({
      calendarId: config.google.calendarId,
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: true,          // espande i ricorrenti: niente RRULE da gestire
      orderBy: "startTime",
      maxResults: 250,
    });
    return (res.data.items ?? []).filter((e) => e.status !== "cancelled").map(normalize);
  },

  async get(id: string): Promise<CalendarEvent | undefined> {
    try {
      const res = await calendar().events.get({ calendarId: config.google.calendarId, eventId: id });
      return normalize(res.data);
    } catch {
      return undefined;
    }
  },

  // ---------- B4: scrittura ----------
  async create(input: NewEvent): Promise<CalendarEvent> {
    const res = await calendar().events.insert({
      calendarId: config.google.calendarId,
      requestBody: toGoogle(input),
      // TODO: "all" manda gli inviti ai partecipanti. In demo forse meglio "none".
      sendUpdates: "none",
    });
    return normalize(res.data);
  },

  async update(id: string, patch: EventPatch): Promise<CalendarEvent> {
    const res = await calendar().events.patch({
      calendarId: config.google.calendarId,
      eventId: id,
      requestBody: toGoogle(patch),
      sendUpdates: "none",
    });
    return normalize(res.data);
  },

  async remove(id: string): Promise<void> {
    try {
      await calendar().events.delete({ calendarId: config.google.calendarId, eventId: id, sendUpdates: "none" });
    } catch (err: any) {
      if (err?.code === 404 || err?.code === 410) throw new HttpError(404, `Evento ${id} non trovato su Google`);
      throw err;
    }
  },
};
