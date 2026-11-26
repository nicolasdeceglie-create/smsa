import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventCard } from "@/components/EventCard";
import { Header } from "@/components/Header";
import { toDateInput } from "@/lib/dates";
import { loadMockMeetings } from "@/lib/mock";

const meetings = loadMockMeetings();
// cerco per titolo e giorno: gli id cambiano se il file dei dati viene rigenerato
const byId = (title: string, day: string) => meetings.find((m) => m.title === title && toDateInput(m.start) === day)!;
const card = (key: [string, string]) =>
    render(<EventCard meeting={byId(...key)} style={{}} selected={false} flashing={false} onOpen={() => {}} />);

describe("Header: solo vista settimanale", () => {
    it("non ha i filtri giorno, settimana e mese", () => {
        render(
            <Header
                weekStart={new Date("2026-11-23T00:00:00+01:00")}
                status={{ source: "mock", online: true, backendMock: false, updatedAt: new Date(), error: null }}
                onPrev={() => {}}
                onNext={() => {}}
                onToday={() => {}}
            />
        );
        expect(screen.queryByRole("group", { name: "Vista" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Giorno" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Mese" })).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "23 – 29 novembre 2026" })).toBeInTheDocument();
    });
});

describe("EventCard: niente testo tagliato", () => {
    it("ha sempre l'informazione completa nel tooltip", () => {
        card(["Standup Tech Leads Software", "2026-11-26"]);
        expect(screen.getByRole("button").getAttribute("title")).toBe(
            "Standup Tech Leads Software\n09:00 – 09:30 · ricorrente\nUtilità alta · Effort basso"
        );
    });

    it("tooltip dei meeting futuri con impact e risposta mancante", () => {
        card(["Escalation Performance - FinTech Italia SpA", "2026-11-26"]);
        expect(screen.getByRole("button").getAttribute("title")).toBe(
            "Escalation Performance - FinTech Italia SpA\n16:00 – 17:00 · da confermare\nImpact 10/10 · vale la pena"
        );
    });

    it("prepara tre versioni dei voti: lunga, corta e a pallini, scelte dal CSS in base allo spazio", () => {
        const { container } = card(["Allineamento Settimanale Cross-Funzionale", "2026-11-16"]);
        expect(container.querySelector("[data-size='long']")).toHaveTextContent("Utilità · bassaEffort · alto");
        expect(container.querySelector("[data-size='short']")).toHaveTextContent("U bassaE alto");
        const dots = container.querySelectorAll("[data-size='dots'] [data-tone]");
        expect([...dots].map((d) => d.getAttribute("data-tone"))).toEqual(["bad", "bad"]);
    });

    it("per i futuri le versioni corte mostrano solo il voto di impact", () => {
        const { container } = card(["Escalation Performance - FinTech Italia SpA", "2026-11-26"]);
        expect(container.querySelector("[data-size='long']")).toHaveTextContent("Impact 10/10 · vale la pena");
        expect(container.querySelector("[data-size='short']")).toHaveTextContent("Impact 10");
        expect(container.querySelector("[data-size='dots']")).toHaveTextContent("10");
    });
});
