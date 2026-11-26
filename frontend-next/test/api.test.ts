import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteMeeting, fetchSnapshot, updateMeeting } from "@/lib/api";

// risposte finte del backend, con la stessa forma di shared/types.ts
const EVENTS = [
    {
        id: "mock-daily--2",
        title: "Daily standup",
        start: "2026-11-24T09:00:00+01:00",
        end: "2026-11-24T09:30:00+01:00",
        attendees: ["giulia.bianchi@azienda.it"],
        source: "google",
        calendar: "Lavoro",
        readonly: false,
    },
    {
        id: "mock-1to1",
        title: "1:1 con Giulia",
        start: "2026-11-26T16:00:00+01:00",
        end: "2026-11-26T16:30:00+01:00",
        attendees: ["giulia.bianchi@azienda.it"],
        source: "google",
        calendar: "Lavoro",
        readonly: false,
    },
    {
        id: "mock-ics-gym",
        title: "Palestra",
        start: "2026-11-26T19:00:00+01:00",
        end: "2026-11-26T20:00:00+01:00",
        attendees: [],
        source: "ics",
        calendar: "iCloud personale",
        readonly: true,
    },
];

const RATINGS = [
    {
        id: 9,
        event_id: "seed-9",
        rating: 2,
        effort: 1,
        note: "Inutile, tutto già scritto su Slack",
        created_at: "2026-11-26T12:00:00.000Z",
        event_title: "Daily standup",
        event_start: "2026-11-24T09:00:00+01:00",
        event_attendees: [],
    },
];

const PREDICTIONS = [
    {
        event_id: "mock-1to1",
        title: "1:1 con Giulia",
        start: "2026-11-26T16:00:00+01:00",
        end: "2026-11-26T16:30:00+01:00",
        rating: 4.3,
        effort: 2,
        quadrant: "keep",
        confidence: "alta",
        reasons: ["stesso meeting già valutato (3 voti: utilità 4.7, effort 1.7)"],
    },
];

const SUMMARY = [
    { title: "Weekly status report", count: 4, avg_rating: 1.5, avg_effort: 4.25, quadrant: "drop" },
    { title: "Daily standup", count: 4, avg_rating: 2.25, avg_effort: 1.5, quadrant: "shorten" },
    { title: "Sprint planning", count: 2, avg_rating: 4, avg_effort: 4.5, quadrant: "optimize" },
    { title: "1:1 con Giulia", count: 3, avg_rating: 4.67, avg_effort: 1.67, quadrant: "keep" },
];

function mockBackend() {
    const fetchMock = vi.fn(async (url: string) => {
        const path = url.replace(/^\/api/, "").split("?")[0];
        const body: Record<string, unknown> = {
            "/health": { ok: true, mock: true, timezone: "Europe/Rome" },
            "/events": EVENTS,
            "/ratings": RATINGS,
            "/predictions": PREDICTIONS,
            "/ratings/summary": SUMMARY,
        };
        return new Response(JSON.stringify(body[path]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchSnapshot", () => {
    const from = new Date("2026-11-23T00:00:00+01:00");
    const to = new Date("2026-12-14T00:00:00+01:00");

    it("chiama tutti gli endpoint passando dal proxy /api", async () => {
        const fetchMock = mockBackend();
        await fetchSnapshot(from, to);
        const paths = fetchMock.mock.calls.map(([u]) => String(u).split("?")[0]);
        expect(paths).toEqual(["/api/health", "/api/events", "/api/ratings", "/api/predictions", "/api/ratings/summary"]);
    });

    it("trova il voto anche quando l'id è diverso, con titolo e orario di inizio", async () => {
        mockBackend();
        const { meetings } = await fetchSnapshot(from, to);
        const daily = meetings.find((m) => m.id === "mock-daily--2")!;
        expect(daily.utilita).toBe("basso");
        expect(daily.effort).toBe("basso");
        expect(daily.impact).toBeNull();
    });

    it("trasforma la previsione 1-5 in impact 0-10 con le motivazioni", async () => {
        mockBackend();
        const { meetings } = await fetchSnapshot(from, to);
        const giulia = meetings.find((m) => m.id === "mock-1to1")!;
        expect(giulia.utilita).toBeNull();
        expect(giulia.impact).toBe(8);
        expect(giulia.impactReasons[0]).toContain("stesso meeting");
    });

    it("lascia gli eventi in sola lettura senza voti né impact", async () => {
        mockBackend();
        const { meetings } = await fetchSnapshot(from, to);
        const gym = meetings.find((m) => m.id === "mock-ics-gym")!;
        expect(gym.readonly).toBe(true);
        expect(gym.calendar).toBe("iCloud personale");
        expect(gym.impact).toBeNull();
    });

    it("prende un suggerimento per quadrante: eliminare, accorciare, ottimizzare", async () => {
        mockBackend();
        const { suggestions, backendMock } = await fetchSnapshot(from, to);
        expect(suggestions.map((s) => [s.title, s.quadrant])).toEqual([
            ["Weekly status report", "drop"],
            ["Daily standup", "shorten"],
            ["Sprint planning", "optimize"],
        ]);
        expect(backendMock).toBe(true);
        expect(suggestions[0].text).toBe("Utilità 1,5 · effort 4,3 su 4 incontri.");
    });

    it("usa il singolare con un solo incontro", async () => {
        mockBackend();
        SUMMARY.push({ title: "Allineamento commerciale", count: 1, avg_rating: 1, avg_effort: 5, quadrant: "drop" });
        const { suggestions } = await fetchSnapshot(from, to);
        SUMMARY.pop();
        expect(suggestions[0].text).toBe("Utilità 1 · effort 5 su 1 incontro.");
    });
});

describe("scritture verso il backend", () => {
    it("deleteMeeting usa DELETE /events/:id", async () => {
        const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);
        await deleteMeeting("mock-1to1");
        expect(fetchMock).toHaveBeenCalledWith("/api/events/mock-1to1", expect.objectContaining({ method: "DELETE" }));
    });

    it("updateMeeting manda il patch in JSON", async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        await updateMeeting("mock-1to1", { title: "1:1" });
        const init = fetchMock.mock.calls[0][1]!;
        expect(init.method).toBe("PATCH");
        expect(JSON.parse(String(init.body))).toEqual({ title: "1:1" });
    });

    it("mostra il messaggio di errore del backend", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Evento non trovato" }), { status: 404 })));
        await expect(deleteMeeting("x")).rejects.toThrow("Evento non trovato");
    });
});
