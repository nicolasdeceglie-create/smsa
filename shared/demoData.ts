// ============================================================
//  Calendario di esempio del gruppo DB (backend/example-data/calendario.json).
//  Converte il suo formato in quello comune di types.ts, per il connettore
//  mock del backend (MOCK_DATA_FILE) e per il seed del database (SEED_FILE).
// ============================================================
import { readFileSync } from "node:fs";
import type { CalendarEvent } from "./types.ts";

export type DemoLevel = "basso" | "medio" | "alto";

export interface DemoEvent {
    id: string;
    title: string;
    description: string;
    start: string;
    end: string;
    is_recurring: boolean;
    organizer: string;
    attendees: { email: string; response_status: string }[];
    utilita: DemoLevel | null;
    effort: DemoLevel | null;
    likeability: number;
}

export interface DemoCalendar {
    calendar_owner: string;
    events: DemoEvent[];
}

/** Stessa scala dei rating del db: basso 1, medio 3, alto 5 */
export const LEVEL_SCORE: Record<DemoLevel, number> = { basso: 1, medio: 3, alto: 5 };

export function readDemoCalendar(path: string): DemoCalendar {
    return JSON.parse(readFileSync(path, "utf8")) as DemoCalendar;
}

/** Il proprietario del calendario non compare tra i partecipanti, come con Google */
export function toCalendarEvent(e: DemoEvent, owner: string): CalendarEvent {
    return {
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        attendees: e.attendees.map((a) => a.email).filter((email) => email !== owner),
        source: "google",
        calendar: "Lavoro",
        readonly: false,
    };
}

/** I meeting già valutati, con i voti nella scala 1-5 del db */
export function demoRatings(cal: DemoCalendar): { event: CalendarEvent; rating: number; effort: number }[] {
    return cal.events
        .filter((e) => e.utilita && e.effort)
        .map((e) => ({
            event: toCalendarEvent(e, cal.calendar_owner),
            rating: LEVEL_SCORE[e.utilita!],
            effort: LEVEL_SCORE[e.effort!],
        }));
}
