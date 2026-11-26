import { describe, expect, it } from "vitest";
import { diffMeetings } from "@/lib/activity";
import type { Meeting } from "@/lib/types";

function meeting(id: string, start: string, title = id): Meeting {
    const s = new Date(start);
    return {
        id,
        title,
        description: "",
        start: s,
        end: new Date(s.getTime() + 30 * 60_000),
        organizer: null,
        attendees: [],
        recurring: false,
        readonly: false,
        calendar: "Lavoro",
        myResponse: "accepted",
        utilita: null,
        effort: null,
        impact: null,
        impactReasons: [],
    };
}

describe("diffMeetings: cosa ha cambiato Claude tra due letture", () => {
    const a = meeting("a", "2026-11-27T09:00:00+01:00", "Daily standup");
    const b = meeting("b", "2026-11-27T10:00:00+01:00", "Sprint planning");

    it("non segnala niente se la lista è uguale", () => {
        expect(diffMeetings([a, b], [a, b], new Set())).toEqual([]);
    });

    it("segnala un evento spostato con il nuovo orario", () => {
        const moved = { ...a, start: new Date("2026-11-27T12:30:00+01:00"), end: new Date("2026-11-27T13:00:00+01:00") };
        const [item] = diffMeetings([a, b], [moved, b], new Set());
        expect(item).toMatchObject({ meetingId: "a", verb: "spostato", meetingTitle: "Daily standup" });
        expect(item.detail).toContain("12:30");
    });

    it("segnala un evento nuovo", () => {
        const c = meeting("c", "2026-11-28T11:00:00+01:00", "Call con cliente");
        expect(diffMeetings([a], [a, c], new Set())).toEqual([expect.objectContaining({ meetingId: "c", verb: "creato" })]);
    });

    it("segnala un evento sparito, ma non quelli eliminati dall'utente", () => {
        expect(diffMeetings([a, b], [a], new Set())).toEqual([expect.objectContaining({ meetingId: "b", verb: "eliminato" })]);
        expect(diffMeetings([a, b], [a], new Set(["b"]))).toEqual([]);
    });

    it("segnala un cambio di titolo", () => {
        const renamed = { ...b, title: "Sprint planning (breve)" };
        expect(diffMeetings([b], [renamed], new Set())[0]).toMatchObject({ verb: "rinominato", meetingTitle: "Sprint planning (breve)" });
    });
});
