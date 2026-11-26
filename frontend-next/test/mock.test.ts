import { describe, expect, it } from "vitest";
import { CALENDAR_OWNER, loadMockMeetings } from "@/lib/mock";

describe("dati del gruppo DB (calendario.json)", () => {
    const meetings = loadMockMeetings();
    const byId = (id: string) => meetings.find((m) => m.id === id)!;

    it("carica tutti i 36 eventi di marco.rossi", () => {
        expect(meetings).toHaveLength(36);
        expect(CALENDAR_OWNER).toBe("marco.rossi@azienda.it");
    });

    it("i meeting passati hanno utilità ed effort e nessun impact", () => {
        const m = byId("evt_001");
        expect(m.utilita).toBe("basso");
        expect(m.effort).toBe("alto");
        expect(m.impact).toBeNull();
        expect(m.recurring).toBe(true);
    });

    it("i futuri hanno impact = likeability / 10 e la mia risposta all'invito", () => {
        const m = byId("evt_022");
        expect(m.utilita).toBeNull();
        expect(m.impact).toBe(10);
        expect(m.myResponse).toBe("needsAction");
        expect(m.organizer).toBe("r.marino@fintechitalia.it");
        expect(byId("evt_024").impact).toBe(2);
    });

    it("le date diventano oggetti Date", () => {
        expect(byId("evt_021").start.toISOString()).toBe("2026-11-26T13:30:00.000Z");
    });
});
