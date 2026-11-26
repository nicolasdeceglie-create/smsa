import { describe, expect, it } from "vitest";
import { addDays, dayIndex, fmtDayLong, fmtWeekRange, hours, startOfWeek, toDateInput, toTimeInput } from "@/lib/dates";

describe("date", () => {
    it("la settimana parte dal lunedì, anche di domenica", () => {
        expect(toDateInput(startOfWeek(new Date("2026-11-26T15:00:00+01:00")))).toBe("2026-11-23");
        expect(toDateInput(startOfWeek(new Date("2026-11-29T23:00:00+01:00")))).toBe("2026-11-23");
        expect(toDateInput(startOfWeek(new Date("2026-11-30T08:00:00+01:00")))).toBe("2026-11-30");
    });

    it("dayIndex conta i giorni dal lunedì", () => {
        const monday = startOfWeek(new Date("2026-11-26T12:00:00+01:00"));
        expect(dayIndex(monday, new Date("2026-11-23T09:30:00+01:00"))).toBe(0);
        expect(dayIndex(monday, new Date("2026-11-27T14:30:00+01:00"))).toBe(4);
        expect(dayIndex(monday, new Date("2026-11-30T09:30:00+01:00"))).toBe(7);
    });

    it("hours dà l'ora con i minuti in decimale", () => {
        expect(hours(new Date("2026-11-26T14:30:00+01:00"))).toBe(14.5);
    });

    it("intervallo della settimana, anche a cavallo di due mesi", () => {
        expect(fmtWeekRange(startOfWeek(new Date("2026-11-26T12:00:00+01:00")))).toBe("23 – 29 novembre 2026");
        expect(fmtWeekRange(startOfWeek(new Date("2026-12-01T12:00:00+01:00")))).toBe("30 novembre – 6 dicembre 2026");
    });

    it("formati per il riquadro e per i campi del form", () => {
        const d = new Date("2026-11-26T09:05:00+01:00");
        expect(fmtDayLong(d)).toBe("Giovedì 26 novembre");
        expect(toTimeInput(d)).toBe("09:05");
        expect(toDateInput(addDays(d, 5))).toBe("2026-12-01");
    });
});
