import { describe, expect, it } from "vitest";
import {
    impactFromRating,
    impactVerdict,
    levelFromScore,
    quadrantOf,
    quadrantOfMeeting,
    suggestionsFrom,
    toneOf,
} from "@/lib/scores";
import type { Level, Meeting } from "@/lib/types";

function rated(title: string, utilita: Level, effort: Level): Meeting {
    return {
        id: `${title}-${Math.random()}`,
        title,
        description: "",
        start: new Date("2026-11-23T10:00:00+01:00"),
        end: new Date("2026-11-23T11:00:00+01:00"),
        organizer: null,
        attendees: [],
        recurring: false,
        readonly: false,
        calendar: "Lavoro",
        myResponse: "accepted",
        utilita,
        effort,
        impact: null,
        impactReasons: [],
    };
}

describe("levelFromScore: voti 1-5 del backend → basso/medio/alto", () => {
    it.each([
        [1, "basso"],
        [2, "basso"],
        [2.9, "medio"],
        [3, "medio"],
        [3.9, "medio"],
        [4, "alto"],
        [5, "alto"],
    ])("%s → %s", (score, level) => {
        expect(levelFromScore(score)).toBe(level);
    });
});

describe("quadrantOf: stessa regola di shared/types.ts", () => {
    it("rating >= 3 è alto, effort > 3 è alto", () => {
        expect(quadrantOf(4, 2)).toBe("keep");
        expect(quadrantOf(4, 4)).toBe("optimize");
        expect(quadrantOf(2, 2)).toBe("shorten");
        expect(quadrantOf(2, 4)).toBe("drop");
        expect(quadrantOf(3, 3)).toBe("keep");
    });

    it("un meeting senza voti non ha quadrante", () => {
        const m = rated("x", "alto", "basso");
        expect(quadrantOfMeeting(m)).toBe("keep");
        expect(quadrantOfMeeting({ ...m, utilita: null, effort: null })).toBeNull();
    });
});

describe("toneOf: utilità alta è buona, effort alto è cattivo", () => {
    it("utilità", () => {
        expect(toneOf("utilita", "alto")).toBe("good");
        expect(toneOf("utilita", "medio")).toBe("mid");
        expect(toneOf("utilita", "basso")).toBe("bad");
    });

    it("effort", () => {
        expect(toneOf("effort", "basso")).toBe("good");
        expect(toneOf("effort", "alto")).toBe("bad");
        expect(toneOf("effort", null)).toBe("none");
    });
});

describe("impact", () => {
    it("rating previsto 1-5 → 0-10", () => {
        expect(impactFromRating(1)).toBe(0);
        expect(impactFromRating(3)).toBe(5);
        expect(impactFromRating(5)).toBe(10);
        expect(impactFromRating(4.3)).toBe(8);
    });

    it("giudizio: 7-10 vale la pena, 4-6 valuta, 0-3 puoi saltarlo", () => {
        expect(impactVerdict(10).short).toBe("vale la pena");
        expect(impactVerdict(7).tone).toBe("good");
        expect(impactVerdict(6).tone).toBe("mid");
        expect(impactVerdict(4).short).toBe("valuta");
        expect(impactVerdict(3).tone).toBe("bad");
        expect(impactVerdict(0).short).toBe("puoi saltarlo");
    });
});

describe("suggestionsFrom", () => {
    it("un suggerimento per quadrante, nell'ordine eliminare, accorciare, ottimizzare", () => {
        const list = [
            rated("Allineamento Cross-Funzionale", "basso", "alto"),
            rated("Allineamento Cross-Funzionale", "basso", "alto"),
            rated("Review Design System", "basso", "basso"),
            rated("Budgeting 2027", "alto", "alto"),
            rated("1:1 CTO", "alto", "medio"),
        ];
        const tips = suggestionsFrom(list);
        expect(tips.map((t) => t.quadrant)).toEqual(["drop", "shorten", "optimize"]);
        expect(tips[0].title).toBe("Allineamento Cross-Funzionale");
        expect(tips[0].text).toContain("2 volte");
    });

    it("ignora i meeting non valutati", () => {
        const m = rated("Futuro", "alto", "alto");
        expect(suggestionsFrom([{ ...m, utilita: null, effort: null }])).toEqual([]);
    });
});
