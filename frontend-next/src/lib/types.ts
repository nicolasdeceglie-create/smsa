// Modello usato da tutta la UI. Sia il file mock sia il backend
// vengono convertiti in questo formato (vedi mock.ts e api.ts).

export type Level = "basso" | "medio" | "alto";

export type Quadrant = "keep" | "optimize" | "shorten" | "drop";

export type ResponseStatus = "accepted" | "declined" | "tentative" | "needsAction";

export interface Attendee {
    email: string;
    status: ResponseStatus;
}

export interface Meeting {
    id: string;
    title: string;
    description: string;
    start: Date;
    end: Date;
    organizer: string | null;
    attendees: Attendee[];
    recurring: boolean;
    readonly: boolean;
    calendar: string;
    /** risposta del proprietario del calendario all'invito */
    myResponse: ResponseStatus;
    /** valutazione data dopo il meeting (null se non ancora valutato) */
    utilita: Level | null;
    effort: Level | null;
    /** previsione 0-10 per i meeting futuri non valutati */
    impact: number | null;
    impactReasons: string[];
}

export interface MeetingPatch {
    title?: string;
    start?: string;
    end?: string;
}

export interface Suggestion {
    title: string;
    quadrant: Quadrant;
    text: string;
}

/** "Ha <verb> <meetingTitle> <detail>", es. "Ha spostato Daily a ven 27 alle 12:30" */
export interface ActivityItem {
    id: string;
    meetingId: string;
    at: Date;
    verb: string;
    meetingTitle: string;
    detail: string;
}

export interface SourceStatus {
    source: "mock" | "api";
    online: boolean;
    backendMock: boolean;
    updatedAt: Date | null;
    error: string | null;
}
