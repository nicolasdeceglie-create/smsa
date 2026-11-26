// Dati del gruppo DB (backend/example-data/calendario.json), usati quando
// NEXT_PUBLIC_DATA_SOURCE=mock. La likeability (0-100) diventa l'impact 0-10.
import raw from "@/data/calendario.json";
import type { Level, Meeting, ResponseStatus } from "./types";

interface RawEvent {
    id: string;
    title: string;
    description: string;
    start: string;
    end: string;
    is_recurring: boolean;
    organizer: string;
    attendees: { email: string; response_status: string }[];
    utilita: string | null;
    effort: string | null;
    likeability: number;
}

const data = raw as { calendar_owner: string; events: RawEvent[] };

export const CALENDAR_OWNER = data.calendar_owner;

function toMeeting(e: RawEvent): Meeting {
    const mine = e.attendees.find((a) => a.email === CALENDAR_OWNER);
    const rated = e.utilita !== null && e.effort !== null;
    return {
        id: e.id,
        title: e.title,
        description: e.description,
        start: new Date(e.start),
        end: new Date(e.end),
        organizer: e.organizer,
        attendees: e.attendees.map((a) => ({ email: a.email, status: a.response_status as ResponseStatus })),
        recurring: e.is_recurring,
        readonly: false,
        calendar: "Lavoro",
        myResponse: (mine?.response_status as ResponseStatus) ?? "accepted",
        utilita: e.utilita as Level | null,
        effort: e.effort as Level | null,
        impact: rated ? null : Math.round(e.likeability / 10),
        impactReasons: [],
    };
}

export function loadMockMeetings(): Meeting[] {
    return data.events.map(toMeeting);
}
