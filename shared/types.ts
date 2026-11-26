// ============================================================
//  CONTRATTI CONDIVISI — usati da db, backend, mcp e frontend.
//  Ogni modifica qui va concordata con TUTTI i team.
// ============================================================

/** Da quale calendario arriva l'evento */
export type EventSource = "google" | "ics";

/** Evento normalizzato (uguale per Google, iCloud, ecc.) */
export interface CalendarEvent {
  id: string;            // id univoco (per Google: id Google; per ICS: uid + start)
  title: string;
  start: string;         // ISO 8601 con fuso, es. "2026-11-27T10:00:00+01:00"
  end: string;           // ISO 8601 con fuso
  attendees: string[];   // email dei partecipanti
  source: EventSource;
  calendar: string;      // nome leggibile, es. "Lavoro", "iCloud personale"
  readonly: boolean;     // true = non modificabile (es. calendari ICS)
}

/** Body per creare un evento */
export interface NewEvent {
  title: string;
  start: string;
  end: string;
  attendees?: string[];
}

/** Body per modificare un evento (tutti i campi opzionali) */
export type EventPatch = Partial<NewEvent>;

/** Punteggio di un meeting */
export interface Rating {
  id: number;
  event_id: string;
  rating: number;        // 1-5: quanto è stato utile / com'è andato
  effort: number;        // 1-5: quanto è costato in energia / preparazione
  note: string | null;
  created_at: string;    // ISO 8601
}

/** Body per salvare un rating */
export interface NewRating {
  event_id: string;
  rating: number;
  effort: number;
  note?: string;
}

/** Rating arricchito con i dati dell'evento (per UI e analisi di Claude) */
export interface RatingWithEvent extends Rating {
  event_title: string;
  event_start: string;
  event_attendees: string[];
}

/**
 * Matrice rating × effort
 *  - keep:     rating alto, effort basso  → da tenere
 *  - optimize: rating alto, effort alto   → utile ma pesante, da ottimizzare
 *  - shorten:  rating basso, effort basso → da accorciare / rendere asincrono
 *  - drop:     rating basso, effort alto  → da eliminare
 */
export type Quadrant = "keep" | "optimize" | "shorten" | "drop";

/** Riepilogo per meeting (raggruppato per titolo, utile per i ricorrenti) */
export interface MeetingSummary {
  title: string;
  count: number;
  avg_rating: number;
  avg_effort: number;
  quadrant: Quadrant;
}

/** Slot libero in agenda */
export interface FreeSlot {
  start: string;
  end: string;
}

/** Soglia per la matrice: rating >= 3 è "alto", effort > 3 è "alto" */
export const QUADRANT_THRESHOLD = 3;

export function quadrantOf(avgRating: number, avgEffort: number): Quadrant {
  const highRating = avgRating >= QUADRANT_THRESHOLD;
  const highEffort = avgEffort > QUADRANT_THRESHOLD;
  if (highRating && !highEffort) return "keep";
  if (highRating && highEffort) return "optimize";
  if (!highRating && !highEffort) return "shorten";
  return "drop";
}
