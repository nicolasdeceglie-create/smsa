// ============================================================
//  Modulo di accesso ai dati — usato dal backend.
//  Usa SQLite integrato in Node (node:sqlite, Node >= 22.13):
//  niente dipendenze native da compilare su Windows.
// ============================================================
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  quadrantOf,
  type CalendarEvent,
  type MeetingSummary,
  type NewRating,
  type Rating,
  type RatingWithEvent,
} from "../../shared/types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SMSA_DB_PATH ?? join(here, "..", "data", "smsa.db");
const SCHEMA_PATH = join(here, "..", "schema.sql");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(readFileSync(SCHEMA_PATH, "utf8"));
  }
  return db;
}

// ---------- events_cache ----------

/** Salva/aggiorna la "fotografia" di un evento (da chiamare prima di addRating). */
export function upsertEventSnapshot(e: CalendarEvent): void {
  getDb()
    .prepare(
      `INSERT INTO events_cache (id, title, start, end, attendees, source, calendar)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title, start = excluded.start, end = excluded.end,
         attendees = excluded.attendees, source = excluded.source, calendar = excluded.calendar`
    )
    .run(e.id, e.title, e.start, e.end, JSON.stringify(e.attendees), e.source, e.calendar);
}

// ---------- ratings ----------

export function addRating(r: NewRating): Rating {
  const row = getDb()
    .prepare(
      `INSERT INTO ratings (event_id, rating, effort, note)
       VALUES (?, ?, ?, ?)
       RETURNING id, event_id, rating, effort, note, created_at`
    )
    .get(r.event_id, r.rating, r.effort, r.note ?? null) as unknown as Rating;
  return row;
}

type RatingRow = Omit<RatingWithEvent, "event_attendees"> & { event_attendees: string };

const SELECT_WITH_EVENT = `
  SELECT r.id, r.event_id, r.rating, r.effort, r.note, r.created_at,
         e.title AS event_title, e.start AS event_start, e.attendees AS event_attendees
  FROM ratings r
  JOIN events_cache e ON e.id = r.event_id`;

function parseRow(row: RatingRow): RatingWithEvent {
  return { ...row, event_attendees: JSON.parse(row.event_attendees) };
}

/** Tutti i rating, dal più recente. */
export function getRatings(): RatingWithEvent[] {
  const rows = getDb()
    .prepare(`${SELECT_WITH_EVENT} ORDER BY e.start DESC`)
    .all() as unknown as RatingRow[];
  return rows.map(parseRow);
}

export function getRatingsByEvent(eventId: string): RatingWithEvent[] {
  const rows = getDb()
    .prepare(`${SELECT_WITH_EVENT} WHERE r.event_id = ? ORDER BY r.created_at DESC`)
    .all(eventId) as unknown as RatingRow[];
  return rows.map(parseRow);
}

/** Medie per titolo del meeting (i ricorrenti hanno lo stesso titolo) + quadrante. */
export function getSummary(): MeetingSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT e.title AS title, COUNT(*) AS count,
              ROUND(AVG(r.rating), 2) AS avg_rating,
              ROUND(AVG(r.effort), 2) AS avg_effort
       FROM ratings r JOIN events_cache e ON e.id = r.event_id
       GROUP BY e.title
       ORDER BY avg_rating ASC, avg_effort DESC`
    )
    .all() as unknown as Omit<MeetingSummary, "quadrant">[];
  return rows.map((r) => ({ ...r, quadrant: quadrantOf(r.avg_rating, r.avg_effort) }));
}

/** Svuota tutto (usato da reset). */
export function clearAll(): void {
  getDb().exec("DELETE FROM ratings; DELETE FROM events_cache;");
}
