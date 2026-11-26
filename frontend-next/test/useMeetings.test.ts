import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMeetings } from "@/hooks/useMeetings";

// senza NEXT_PUBLIC_DATA_SOURCE l'hook usa i dati mock, quindi niente rete
const from = new Date("2026-11-23T00:00:00+01:00");
const to = new Date("2026-12-14T00:00:00+01:00");

describe("useMeetings in modalità mock", () => {
    it("parte con i 36 eventi e i suggerimenti calcolati", () => {
        const { result } = renderHook(() => useMeetings(from, to));
        expect(result.current.meetings).toHaveLength(36);
        expect(result.current.status.source).toBe("mock");
        expect(result.current.suggestions[0].quadrant).toBe("drop");
    });

    it("conferma la partecipazione a un invito", () => {
        const { result } = renderHook(() => useMeetings(from, to));
        act(() => result.current.confirm("evt_022"));
        expect(result.current.meetings.find((m) => m.id === "evt_022")!.myResponse).toBe("accepted");
    });

    it("elimina un evento", async () => {
        const { result } = renderHook(() => useMeetings(from, to));
        await act(() => result.current.remove("evt_024"));
        expect(result.current.meetings.find((m) => m.id === "evt_024")).toBeUndefined();
    });

    it("modifica titolo e orario", async () => {
        const { result } = renderHook(() => useMeetings(from, to));
        await act(() => result.current.update("evt_021", { title: "Deep-dive", start: "2026-11-26T15:00:00+01:00", end: "2026-11-26T16:00:00+01:00" }));
        const m = result.current.meetings.find((x) => x.id === "evt_021")!;
        expect(m.title).toBe("Deep-dive");
        expect(m.start.toISOString()).toBe("2026-11-26T14:00:00.000Z");
    });

    it("la simulazione di Claude sposta un meeting, lo registra una volta e lo fa lampeggiare", () => {
        const { result } = renderHook(() => useMeetings(from, to));
        act(() => result.current.simulateClaude());
        expect(result.current.activity).toHaveLength(1);
        const { meetingId, verb } = result.current.activity[0];
        expect(verb).toBe("spostato");
        expect(result.current.flashIds.has(meetingId)).toBe(true);
    });
});
