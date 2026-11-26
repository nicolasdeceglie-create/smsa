import type { Level, Meeting, Quadrant, Suggestion } from "./types";

// Il backend lavora con voti 1-5, il file del gruppo DB con basso/medio/alto.
export function levelFromScore(score: number): Level {
    if (score <= 2) return "basso";
    if (score < 4) return "medio";
    return "alto";
}

export const SCORE_OF_LEVEL: Record<Level, number> = { basso: 1, medio: 3, alto: 5 };

/** Stessa regola di quadrantOf() in shared/types.ts: rating >= 3 alto, effort > 3 alto */
export function quadrantOf(rating: number, effort: number): Quadrant {
    const highRating = rating >= 3;
    const highEffort = effort > 3;
    if (highRating && !highEffort) return "keep";
    if (highRating && highEffort) return "optimize";
    if (!highRating && !highEffort) return "shorten";
    return "drop";
}

export function quadrantOfMeeting(m: Meeting): Quadrant | null {
    if (!m.utilita || !m.effort) return null;
    return quadrantOf(SCORE_OF_LEVEL[m.utilita], SCORE_OF_LEVEL[m.effort]);
}

export const QUADRANT_LABEL: Record<Quadrant, string> = {
    keep: "Da tenere",
    optimize: "Da ottimizzare",
    shorten: "Da accorciare",
    drop: "Da eliminare",
};

export type Tone = "good" | "mid" | "bad" | "none";

/** Utilità alta è buona, effort alto è cattivo */
export function toneOf(kind: "utilita" | "effort", level: Level | null): Tone {
    if (!level) return "none";
    if (level === "medio") return "mid";
    const good = kind === "utilita" ? "alto" : "basso";
    return level === good ? "good" : "bad";
}

export const LEVEL_LABEL: Record<"utilita" | "effort", Record<Level, string>> = {
    utilita: { basso: "bassa", medio: "media", alto: "alta" },
    effort: { basso: "basso", medio: "medio", alto: "alto" },
};

export const LEVEL_STEPS: Record<Level, number> = { basso: 1, medio: 2, alto: 3 };

/** Previsione del backend (rating 1-5) → impact 0-10 */
export function impactFromRating(rating: number): number {
    return Math.round(((rating - 1) / 4) * 10);
}

export function impactVerdict(impact: number): { tone: Tone; text: string; short: string } {
    if (impact >= 7) return { tone: "good", text: "vale la pena partecipare", short: "vale la pena" };
    if (impact >= 4) return { tone: "mid", text: "valuta se delegarlo", short: "valuta" };
    return { tone: "bad", text: "puoi saltarlo", short: "puoi saltarlo" };
}

const ADVICE: Record<Quadrant, string> = {
    drop: "Costa molto e serve poco: meglio rifiutarlo e chiedere il verbale.",
    shorten: "Serve poco: accorcialo o trasformalo in un aggiornamento scritto.",
    optimize: "Utile ma pesante: prepara il materiale prima per arrivare già allineato.",
    keep: "Utile e leggero: da tenere così.",
};

/** Suggerimenti dai meeting già valutati, raggruppati per titolo (utile per i ricorrenti) */
export function suggestionsFrom(meetings: Meeting[]): Suggestion[] {
    const groups = new Map<string, { r: number; e: number; n: number }>();
    for (const m of meetings) {
        if (!m.utilita || !m.effort) continue;
        const g = groups.get(m.title) ?? { r: 0, e: 0, n: 0 };
        g.r += SCORE_OF_LEVEL[m.utilita];
        g.e += SCORE_OF_LEVEL[m.effort];
        g.n += 1;
        groups.set(m.title, g);
    }
    const order: Quadrant[] = ["drop", "shorten", "optimize"];
    const list = [...groups].map(([title, g]) => {
        const quadrant = quadrantOf(g.r / g.n, g.e / g.n);
        const times = g.n > 1 ? ` (${g.n} volte)` : "";
        return { title, quadrant, text: ADVICE[quadrant] + times, weight: g.e / g.n - g.r / g.n + g.n * 0.1 };
    });
    return order
        .flatMap((q) => list.filter((s) => s.quadrant === q).sort((a, b) => b.weight - a.weight).slice(0, 1))
        .map(({ title, quadrant, text }) => ({ title, quadrant, text }));
}
