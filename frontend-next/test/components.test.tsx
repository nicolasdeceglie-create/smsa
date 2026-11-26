import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EventCard } from "@/components/EventCard";
import { EventPopover } from "@/components/EventPopover";
import { Sidebar } from "@/components/Sidebar";
import { loadMockMeetings } from "@/lib/mock";

const meetings = loadMockMeetings();
const byId = (id: string) => meetings.find((m) => m.id === id)!;

describe("EventCard", () => {
    it("meeting passato: utilità ed effort sotto il titolo", () => {
        render(<EventCard meeting={byId("evt_001")} style={{}} selected={false} flashing={false} onOpen={() => {}} />);
        expect(screen.getByText("Allineamento Settimanale Cross-Funzionale")).toBeInTheDocument();
        expect(screen.getByText("Utilità · bassa")).toBeInTheDocument();
        expect(screen.getByText("Effort · alto")).toBeInTheDocument();
        expect(screen.queryByText(/Impact/)).not.toBeInTheDocument();
    });

    it("meeting breve: etichette corte U ed E", () => {
        render(<EventCard meeting={byId("evt_019")} style={{}} selected={false} flashing={false} onOpen={() => {}} />);
        expect(screen.getByText("U · alta")).toBeInTheDocument();
        expect(screen.getByText("E · basso")).toBeInTheDocument();
    });

    it("meeting futuro: impact al posto di utilità ed effort", () => {
        render(<EventCard meeting={byId("evt_022")} style={{}} selected={false} flashing={false} onOpen={() => {}} />);
        expect(screen.getByText("Impact 10/10 · vale la pena")).toBeInTheDocument();
        expect(screen.queryByText(/Utilità/)).not.toBeInTheDocument();
        expect(screen.getByText(/da confermare/)).toBeInTheDocument();
    });

    it("mostra l'etichetta quando l'ha modificato Claude e apre il dettaglio al clic", async () => {
        const onOpen = vi.fn();
        render(<EventCard meeting={byId("evt_023")} style={{}} selected={false} flashing onOpen={onOpen} />);
        expect(screen.getByText("Modificato da Claude")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: /Raccolta Feedback/ }));
        expect(onOpen).toHaveBeenCalledOnce();
    });
});

describe("EventPopover", () => {
    const noop = async () => {};

    it("meeting passato: scale di utilità ed effort, niente conferma", () => {
        render(<EventPopover meeting={byId("evt_001")} placement={{}} onClose={() => {}} onDelete={noop} onConfirm={() => {}} onSave={noop} />);
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("Aggiornamento generico sullo stato avanzamento lavori di tutti i reparti aziendali.")).toBeInTheDocument();
        expect(within(dialog).getByText("Utilità")).toBeInTheDocument();
        expect(within(dialog).getByText("bassa")).toBeInTheDocument();
        expect(within(dialog).getByText("alto")).toBeInTheDocument();
        expect(within(dialog).getByText("5 invitati · tutti hanno accettato")).toBeInTheDocument();
        expect(within(dialog).getByText("Si ripete ogni settimana")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Conferma partecipazione" })).not.toBeInTheDocument();
    });

    it("invito futuro: impact, chi manca e pulsante di conferma", async () => {
        const onConfirm = vi.fn();
        render(<EventPopover meeting={byId("evt_022")} placement={{}} onClose={() => {}} onDelete={noop} onConfirm={onConfirm} onSave={noop} />);
        expect(screen.getByText("Impact 10/10 · vale la pena partecipare")).toBeInTheDocument();
        expect(screen.getByText("4 invitati · 3 hanno accettato, manca la tua risposta")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Conferma partecipazione" }));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("con un solo invitato usa il singolare", () => {
        const solo = { ...byId("evt_021"), attendees: [{ email: "giulia.bianchi@azienda.it", status: "accepted" as const }], myResponse: "accepted" as const };
        render(<EventPopover meeting={solo} placement={{}} onClose={() => {}} onDelete={noop} onConfirm={() => {}} onSave={noop} />);
        expect(screen.getByText("1 invitato · tutti hanno accettato")).toBeInTheDocument();
    });

    it("contatta i partecipanti apre una mail a tutti tranne il proprietario", () => {
        render(<EventPopover meeting={byId("evt_022")} placement={{}} onClose={() => {}} onDelete={noop} onConfirm={() => {}} onSave={noop} />);
        const href = screen.getByRole("link", { name: "Contatta i partecipanti" }).getAttribute("href")!;
        expect(href).toContain("r.marino@fintechitalia.it");
        expect(href).not.toContain("marco.rossi@azienda.it");
    });

    it("elimina e chiudi chiamano le callback", async () => {
        const onDelete = vi.fn(async () => {});
        const onClose = vi.fn();
        render(<EventPopover meeting={byId("evt_021")} placement={{}} onClose={onClose} onDelete={onDelete} onConfirm={() => {}} onSave={noop} />);
        await userEvent.click(screen.getByRole("button", { name: "Elimina evento" }));
        await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
        expect(onDelete).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("modifica: salva titolo e orari e blocca una fine prima dell'inizio", async () => {
        const onSave = vi.fn(async () => {});
        render(<EventPopover meeting={byId("evt_021")} placement={{}} onClose={() => {}} onDelete={noop} onConfirm={() => {}} onSave={onSave} />);
        await userEvent.click(screen.getByRole("button", { name: "Modifica evento" }));

        const title = screen.getByLabelText("Titolo");
        await userEvent.clear(title);
        await userEvent.type(title, "Deep-dive API");
        const end = screen.getByLabelText("Fine");
        await userEvent.clear(end);
        await userEvent.type(end, "14:00");
        await userEvent.click(screen.getByRole("button", { name: "Salva" }));
        expect(screen.getByRole("alert")).toHaveTextContent("La fine deve essere dopo l'inizio");
        expect(onSave).not.toHaveBeenCalled();

        await userEvent.clear(end);
        await userEvent.type(end, "16:00");
        await userEvent.click(screen.getByRole("button", { name: "Salva" }));
        expect(onSave).toHaveBeenCalledWith({
            title: "Deep-dive API",
            start: new Date("2026-11-26T14:30:00+01:00").toISOString(),
            end: new Date("2026-11-26T16:00:00+01:00").toISOString(),
        });
    });

    it("mostra l'errore del backend se l'eliminazione fallisce", async () => {
        const onDelete = vi.fn(async () => {
            throw new Error("Evento non trovato");
        });
        render(<EventPopover meeting={byId("evt_021")} placement={{}} onClose={() => {}} onDelete={onDelete} onConfirm={() => {}} onSave={noop} />);
        await userEvent.click(screen.getByRole("button", { name: "Elimina evento" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Evento non trovato");
    });
});

describe("Sidebar", () => {
    const upcoming = ["evt_021", "evt_022", "evt_024"].map(byId);

    it("elenca i prossimi meeting con impact e giudizio e li apre al clic", async () => {
        const onOpen = vi.fn();
        render(
            <Sidebar activity={[]} upcoming={upcoming} suggestions={[]} selectedId={null} canSimulate={false} onSimulate={() => {}} onOpen={onOpen} />
        );
        const list = screen.getByRole("region", { name: "Impact dei prossimi meeting" });
        const rows = within(list).getAllByRole("button");
        expect(rows).toHaveLength(3);
        expect(rows.filter((r) => r.textContent?.includes("puoi saltarlo"))).toHaveLength(2);
        await userEvent.click(within(list).getByRole("button", { name: /Escalation Performance/ }));
        expect(onOpen).toHaveBeenCalledWith(byId("evt_022"));
    });

    it("feed di Claude: frase completa e pulsante di simulazione solo in mock", async () => {
        const onSimulate = vi.fn();
        render(
            <Sidebar
                activity={[{ id: "1", meetingId: "evt_023", at: new Date("2026-11-26T10:42:00+01:00"), verb: "spostato", meetingTitle: "Raccolta Feedback", detail: "a ven 27 alle 11:00" }]}
                upcoming={[]}
                suggestions={[{ title: "Weekly status report", quadrant: "drop", text: "Meglio via email." }]}
                selectedId={null}
                canSimulate
                onSimulate={onSimulate}
                onOpen={() => {}}
            />
        );
        expect(screen.getByText("10:42")).toBeInTheDocument();
        expect(screen.getByText(/Ha spostato/)).toHaveTextContent("Ha spostato Raccolta Feedback a ven 27 alle 11:00");
        expect(screen.getByText("Da eliminare")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Simula una modifica" }));
        expect(onSimulate).toHaveBeenCalledOnce();
    });
});
