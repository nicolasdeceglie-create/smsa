// ============================================================
//  Connettore ICS (iCloud e altri) — ticket B7. SOLA LETTURA.
//
//  Come ottenere l'URL da iCloud:
//   app Calendario (Mac/iPhone) o icloud.com → clic sul calendario
//   → "Calendario pubblico" → copia il link webcal://...
//   (sostituite "webcal://" con "https://")
//  Poi in .env:  ICS_FEEDS=iCloud personale|https://...
// ============================================================
import ical from "node-ical";
import type { CalendarEvent } from "../../../shared/types.ts";
import { config } from "../config.ts";

export const icsConnector = {
  async list(from: Date, to: Date): Promise<CalendarEvent[]> {
    const all: CalendarEvent[] = [];

    for (const feed of config.icsFeeds) {
      const data = await ical.async.fromURL(feed.url);

      for (const item of Object.values(data)) {
        if (!item || item.type !== "VEVENT") continue;
        const ve = item as ical.VEvent;
        const durationMs = ve.end.getTime() - ve.start.getTime();

        // Ricorrenti: espandiamo le occorrenze nell'intervallo.
        // TODO (B7): escludere le eccezioni (ve.exdate) e le occorrenze spostate (ve.recurrences),
        //   e verificare i fusi orari con un calendario iCloud vero.
        const starts: Date[] = ve.rrule ? ve.rrule.between(from, to, true) : [ve.start];

        for (const start of starts) {
          const end = new Date(start.getTime() + durationMs);
          if (end <= from || start >= to) continue;
          all.push({
            id: `ics-${ve.uid}-${start.toISOString()}`,
            title: typeof ve.summary === "string" ? ve.summary : "(senza titolo)",
            start: start.toISOString(),
            end: end.toISOString(),
            attendees: [],
            source: "ics",
            calendar: feed.name,
            readonly: true,
          });
        }
      }
    }
    return all;
  },
};
