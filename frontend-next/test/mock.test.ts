import { describe, expect, it } from "vitest";
import { dayIndex, startOfWeek } from "@/lib/dates";
import { CALENDAR_OWNER, loadMockMeetings } from "@/lib/mock";

const meetings = loadMockMeetings();
const minutes = (m: { start: Date; end: Date }) => (m.end.getTime() - m.start.getTime()) / 60_000;
const weeks = [16, 23, 30].map((d) => startOfWeek(new Date(`2026-11-${d}T12:00:00+01:00`)));
const inWeek = (w: Date) => meetings.filter((m) => {
    const d = dayIndex(w, m.start);
    return d >= 0 && d < 7;
});

describe("dati del gruppo DB (calendario.json) per la demo", () => {
    it("appartengono a marco.rossi e coprono tre settimane piene", () => {
        expect(CALENDAR_OWNER).toBe("marco.rossi@azienda.it");
        for (const w of weeks) expect(inWeek(w).length).toBeGreaterThanOrEqual(18);
    });

    it("hanno durate diverse, da mezz'ora a 2 ore", () => {
        const durations = new Set(meetings.map(minutes));
        for (const d of [30, 45, 60, 90, 120]) expect(durations).toContain(d);
        expect(Math.min(...durations)).toBe(30);
    });

    it("nessun meeting si sovrappone: in demo ogni blocco resta largo e leggibile", () => {
        const overlaps = meetings.filter((a) => meetings.some((b) => a.id !== b.id && a.start < b.end && b.start < a.end));
        expect(overlaps.map((m) => `${m.title} ${m.start.toISOString()}`)).toEqual([]);
    });

    it("id unici e sempre fine dopo inizio", () => {
        expect(new Set(meetings.map((m) => m.id)).size).toBe(meetings.length);
        expect(meetings.every((m) => m.end > m.start)).toBe(true);
    });

    it("i passati hanno utilità ed effort, i futuri l'impact e alcuni inviti da confermare", () => {
        const cut = new Date("2026-11-26T13:00:00+01:00");
        const past = meetings.filter((m) => m.end <= cut);
        const future = meetings.filter((m) => m.start >= cut);
        expect(past.every((m) => m.utilita && m.effort && m.impact === null)).toBe(true);
        expect(future.every((m) => m.utilita === null && m.impact !== null)).toBe(true);
        expect(future.some((m) => m.myResponse === "needsAction")).toBe(true);
    });

    it("lo stesso meeting ricorrente ha sempre lo stesso titolo e organizzatore", () => {
        const standups = meetings.filter((m) => m.title === "Standup Tech Leads Software");
        expect(standups.length).toBeGreaterThanOrEqual(10);
        expect(new Set(standups.map((m) => m.organizer)).size).toBe(1);
        expect(standups.every((m) => m.recurring)).toBe(true);
    });
});
