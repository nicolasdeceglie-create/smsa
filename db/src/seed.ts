// ============================================================
//  Seed per la demo: ~20 meeting passati con rating ed effort.
//  Copre tutti e 4 i quadranti, con un ricorrente "da eliminare"
//  ben riconoscibile che Claude deve scoprire in demo.
//
//  Uso:  npm run seed      (aggiunge i dati)
//        npm run reset     (svuota e riesegue il seed)
// ============================================================
import { addRating, upsertEventSnapshot } from "./db.ts";
import type { CalendarEvent } from "../../shared/types.ts";
import { toZonedIso } from "../../shared/time.ts";

/** Giorno lavorativo n giorni fa, all'ora indicata (ora di Roma ~ UTC+1) */
function daysAgo(n: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour - 1, minute, 0, 0);
  return d;
}

interface SeedMeeting {
  title: string;
  daysAgo: number;
  hour: number;
  durationMin: number;
  attendees: string[];
  rating: number;
  effort: number;
  note: string;
}

// Persone dell'organigramma (backend/data/organigramma.json), come nel mock del backend
const TEAM = ["giulia.bianchi@azienda.it", "davide.ferrari@azienda.it", "sara.galli@azienda.it"];

const MEETINGS: SeedMeeting[] = [
  // --- DROP: rating basso, effort alto (il "colpevole" della demo) ---
  { title: "Weekly status report", daysAgo: 22, hour: 15, durationMin: 60, attendees: TEAM, rating: 2, effort: 4, note: "Lettura di slide, nessuna decisione" },
  { title: "Weekly status report", daysAgo: 15, hour: 15, durationMin: 60, attendees: TEAM, rating: 1, effort: 5, note: "Preparato report per 2 ore, nessuno l'ha guardato" },
  { title: "Weekly status report", daysAgo: 8, hour: 15, durationMin: 60, attendees: TEAM, rating: 2, effort: 4, note: "Si poteva fare via email" },
  { title: "Weekly status report", daysAgo: 1, hour: 15, durationMin: 60, attendees: TEAM, rating: 1, effort: 4, note: "Ancora slide lette ad alta voce" },
  { title: "Allineamento commerciale", daysAgo: 12, hour: 11, durationMin: 90, attendees: ["luca.verdi@azienda.it"], rating: 2, effort: 5, note: "Troppo lungo, temi fuori dal mio ambito" },

  // --- SHORTEN: rating basso, effort basso ---
  { title: "Daily standup", daysAgo: 7, hour: 9, durationMin: 30, attendees: TEAM, rating: 2, effort: 2, note: "Sforato a 30 minuti" },
  { title: "Daily standup", daysAgo: 6, hour: 9, durationMin: 30, attendees: TEAM, rating: 3, effort: 1, note: "Ok ma dispersivo" },
  { title: "Daily standup", daysAgo: 5, hour: 9, durationMin: 30, attendees: TEAM, rating: 2, effort: 2, note: "Discussione tecnica che andava fatta a parte" },
  { title: "Daily standup", daysAgo: 2, hour: 9, durationMin: 30, attendees: TEAM, rating: 2, effort: 1, note: "Inutile, tutto già scritto su Slack" },

  // --- OPTIMIZE: rating alto, effort alto ---
  { title: "Sprint planning", daysAgo: 14, hour: 10, durationMin: 120, attendees: TEAM, rating: 4, effort: 5, note: "Utile ma estenuante" },
  { title: "Sprint planning", daysAgo: 3, hour: 10, durationMin: 120, attendees: TEAM, rating: 4, effort: 4, note: "Backlog non preparato prima" },
  { title: "Demo cliente FinTech Italia", daysAgo: 9, hour: 14, durationMin: 60, attendees: ["r.marino@fintechitalia.it"], rating: 5, effort: 5, note: "Contratto quasi chiuso, preparazione pesante" },

  // --- KEEP: rating alto, effort basso ---
  { title: "1:1 con Giulia", daysAgo: 21, hour: 16, durationMin: 30, attendees: [TEAM[0]], rating: 5, effort: 2, note: "Molto utile" },
  { title: "1:1 con Giulia", daysAgo: 14, hour: 16, durationMin: 30, attendees: [TEAM[0]], rating: 4, effort: 1, note: "Sbloccato il problema sul deploy" },
  { title: "1:1 con Giulia", daysAgo: 7, hour: 16, durationMin: 30, attendees: [TEAM[0]], rating: 5, effort: 2, note: "" },
  { title: "Retrospettiva", daysAgo: 13, hour: 17, durationMin: 45, attendees: TEAM, rating: 4, effort: 2, note: "Buone azioni concrete" },
  { title: "Caffè con Davide", daysAgo: 4, hour: 11, durationMin: 20, attendees: [TEAM[1]], rating: 4, effort: 1, note: "Idee per il progetto nuovo" },
  { title: "Review architettura", daysAgo: 10, hour: 14, durationMin: 60, attendees: TEAM, rating: 5, effort: 3, note: "Decisioni chiare" },
];

export function seed(): void {
  MEETINGS.forEach((m, i) => {
    const start = daysAgo(m.daysAgo, m.hour);
    const end = new Date(start.getTime() + m.durationMin * 60_000);
    const event: CalendarEvent = {
      id: `seed-${i + 1}`,
      title: m.title,
      start: toZonedIso(start),
      end: toZonedIso(end),
      attendees: m.attendees,
      source: "google",
      calendar: "Lavoro",
      readonly: false,
    };
    upsertEventSnapshot(event);
    addRating({ event_id: event.id, rating: m.rating, effort: m.effort, note: m.note || undefined });
  });
  console.log(`Seed completato: ${MEETINGS.length} meeting con rating.`);
}

// Esegui solo se lanciato direttamente (npm run seed)
if (process.argv[1]?.endsWith("seed.ts")) seed();
