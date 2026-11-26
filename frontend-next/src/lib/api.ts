// Client del backend Express (via proxy /api di next.config.ts).
// I tipi arrivano da shared/types.ts, il contratto comune a tutti i team.
import type {
    CalendarEvent,
    MeetingPrediction,
    MeetingSummary,
    RatingWithEvent,
} from "../../../shared/types";
import { impactFromRating, levelFromScore, quadrantOf } from "./scores";
import type { Meeting, MeetingPatch, Suggestion } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`/api${path}`, { cache: "no-store", ...init });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Errore ${res.status} su ${path}`);
    }
    return res.status === 204 ? (undefined as T) : res.json();
}

/** 1.5 → "1,5", 5 → "5" */
const num = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format;

const qs = (from: Date, to: Date) => `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;

function toMeeting(e: CalendarEvent, rating?: RatingWithEvent, prediction?: MeetingPrediction): Meeting {
    return {
        id: e.id,
        title: e.title,
        description: "",
        start: new Date(e.start),
        end: new Date(e.end),
        organizer: null,
        attendees: e.attendees.map((email) => ({ email, status: "accepted" })),
        recurring: false,
        readonly: e.readonly,
        calendar: e.calendar,
        myResponse: "accepted",
        utilita: rating ? levelFromScore(rating.rating) : null,
        effort: rating ? levelFromScore(rating.effort) : null,
        impact: !rating && prediction ? impactFromRating(prediction.rating) : null,
        impactReasons: prediction?.reasons ?? [],
    };
}

export interface ApiSnapshot {
    meetings: Meeting[];
    suggestions: Suggestion[];
    backendMock: boolean;
}

export async function fetchSnapshot(from: Date, to: Date): Promise<ApiSnapshot> {
    const [health, events, ratings, predictions, summary] = await Promise.all([
        request<{ ok: boolean; mock: boolean }>("/health"),
        request<CalendarEvent[]>(`/events?${qs(from, to)}`),
        request<RatingWithEvent[]>("/ratings"),
        request<MeetingPrediction[]>(`/predictions?${qs(new Date(), to)}`),
        request<MeetingSummary[]>("/ratings/summary"),
    ]);
    // ultimo voto per evento. Lo cerco per id e, se non c'è, per titolo + inizio:
    // i voti del seed hanno id "seed-N" mentre il calendario mock usa "mock-*"
    const byId = new Map<string, RatingWithEvent>();
    const bySlot = new Map<string, RatingWithEvent>();
    const slotKey = (title: string, start: string) => `${title.toLowerCase()}|${new Date(start).getTime()}`;
    for (const r of ratings) {
        const prev = byId.get(r.event_id);
        if (!prev || prev.created_at < r.created_at) {
            byId.set(r.event_id, r);
            bySlot.set(slotKey(r.event_title, r.event_start), r);
        }
    }
    const byPrediction = new Map(predictions.map((p) => [p.event_id, p]));
    const meetings = events.map((e) =>
        toMeeting(e, byId.get(e.id) ?? bySlot.get(slotKey(e.title, e.start)), byPrediction.get(e.id))
    );

    const order = ["drop", "shorten", "optimize"] as const;
    const suggestions: Suggestion[] = order.flatMap((q) =>
        summary
            .filter((s) => quadrantOf(s.avg_rating, s.avg_effort) === q)
            .sort((a, b) => b.avg_effort - b.avg_rating - (a.avg_effort - a.avg_rating))
            .slice(0, 1)
            .map((s) => ({
                title: s.title,
                quadrant: q,
                text: `Utilità ${num(s.avg_rating)} · effort ${num(s.avg_effort)} su ${s.count} ${s.count === 1 ? "incontro" : "incontri"}.`,
            }))
    );
    return { meetings, suggestions, backendMock: health.mock };
}

export function deleteMeeting(id: string): Promise<void> {
    return request(`/events/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function updateMeeting(id: string, patch: MeetingPatch): Promise<CalendarEvent> {
    return request(`/events/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
}
